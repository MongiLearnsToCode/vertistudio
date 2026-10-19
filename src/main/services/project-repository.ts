import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  projectDocumentSchema,
  projectSaveSchema,
  projectIdSchema,
} from '@shared/validation/project-schema';
import type { ProjectSaveRequest, ProjectSummary, OpenProject } from '@shared/ipc/project-types';
import type { VideoInfo } from '@shared/video/types';
import { trimRange } from '@shared/video/presets';

export class ProjectRepository {
  constructor(
    private root: string,
    private allowed: (file: string) => boolean,
    private getVideo: (id: string) => VideoInfo,
    private importVideo: (file: string, name: string) => Promise<VideoInfo>,
  ) {}

  private async checked(file: string): Promise<string> {
    const real = await fs.realpath(file);
    if (!this.allowed(real)) throw new Error('Project file is outside the allowed locations.');
    return real;
  }

  private async storage(): Promise<string> {
    await this.checked(path.dirname(this.root));
    if (!this.allowed(this.root))
      throw new Error('Project storage is outside the allowed locations.');
    await fs.mkdir(this.root, { recursive: true });
    return this.checked(this.root);
  }

  private async directory(id: string): Promise<string> {
    projectIdSchema.parse({ id });
    const directory = path.join(await this.storage(), id);
    if (!this.allowed(directory))
      throw new Error('Project folder is outside the allowed locations.');
    await fs.mkdir(directory, { recursive: true });
    return this.checked(directory);
  }

  private async read(id: string) {
    projectIdSchema.parse({ id });
    const directory = await this.checked(path.join(this.root, id));
    const file = await this.checked(path.join(directory, 'project.json'));
    if ((await fs.stat(file)).size > 2 * 1024 * 1024) throw new Error('Project file is too large.');
    const document = projectDocumentSchema.parse(
      JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '')),
    );
    if (document.id !== id) throw new Error('Project identity does not match its folder.');
    return document;
  }

  async list(): Promise<ProjectSummary[]> {
    const entries = await fs.readdir(await this.storage(), { withFileTypes: true });
    const projects: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !projectIdSchema.safeParse({ id: entry.name }).success) continue;
      const files = await fs.readdir(await this.checked(path.join(this.root, entry.name)));
      if (!files.includes('project.json')) continue;
      const document = await this.read(entry.name);
      projects.push({ id: document.id, name: document.name, updatedAt: document.updatedAt });
    }
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async save(input: ProjectSaveRequest): Promise<ProjectSummary> {
    const request = projectSaveSchema.parse(input);
    const id = request.id ?? randomUUID();
    const previous = request.id ? await this.read(id) : null;
    const directory = await this.directory(id);
    const sources = previous?.sources.slice() ?? [];
    const cuts = [];
    for (const cut of request.cuts) {
      const video = this.getVideo(cut.videoId);
      trimRange(video, cut.trim);
      const stored = sources.find(
        (entry) =>
          entry.originalPath === video.path ||
          path.join(directory, entry.key + entry.extension) === video.path,
      );
      if (stored) {
        await this.checked(path.join(directory, stored.key + stored.extension));
        cuts.push({ source: stored.key, trim: cut.trim });
        continue;
      }
      const source = await this.checked(video.path);
      const extension = path.extname(video.name).toLowerCase();
      const newSource = {
        key: randomUUID(),
        name: video.name,
        originalPath: source,
        extension: /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '',
      };
      const target = path.join(directory, newSource.key + newSource.extension);
      if (!this.allowed(target))
        throw new Error('Source destination is outside the allowed locations.');
      await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
      sources.push(newSource);
      cuts.push({ source: newSource.key, trim: cut.trim });
    }
    const document = projectDocumentSchema.parse({
      version: 1,
      id,
      name: request.name,
      updatedAt: new Date().toISOString(),
      sources,
      cuts,
      options: request.options,
    });
    const temporary = path.join(directory, `${randomUUID()}.tmp`);
    const destination = path.join(directory, 'project.json');
    if (!this.allowed(temporary) || !this.allowed(destination))
      throw new Error('Project destination is outside the allowed locations.');
    await fs.writeFile(temporary, JSON.stringify(document), { flag: 'wx' });
    await fs.rename(temporary, destination);
    return { id, name: document.name, updatedAt: document.updatedAt };
  }

  async open(id: string): Promise<OpenProject> {
    const document = await this.read(id);
    const directory = await this.directory(id);
    const videos = new Map<string, VideoInfo>();
    const cuts = [];
    for (const cut of document.cuts) {
      const source = document.sources.find((entry) => entry.key === cut.source);
      if (!source) throw new Error('Project source information is missing.');
      let video = videos.get(source.key);
      if (!video) {
        const file = await this.checked(path.join(directory, source.key + source.extension));
        video = await this.importVideo(file, source.name);
        videos.set(source.key, video);
      }
      trimRange(video, cut.trim);
      cuts.push({ video, trim: cut.trim });
    }
    return {
      id,
      name: document.name,
      updatedAt: document.updatedAt,
      options: document.options,
      cuts,
    };
  }
}
