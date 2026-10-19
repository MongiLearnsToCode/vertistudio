import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProjectRepository } from '../project-repository';
import type { ProjectSaveRequest } from '@shared/ipc/project-types';
import type { VideoInfo } from '@shared/video/types';

let directory: string;
let root: string;
let original: string;
let videos: Map<string, VideoInfo>;
const options: ProjectSaveRequest['options'] = {
  preset: 'quality',
  fit: 'crop',
  encoder: 'libx264',
  keepFps: true,
};
function repository(allowOriginal = true) {
  return new ProjectRepository(
    root,
    (file) =>
      file === directory ||
      file === root ||
      file.startsWith(root + path.sep) ||
      (allowOriginal && file === original),
    (id) => {
      const video = videos.get(id);
      if (!video) throw new Error('Unknown video');
      return video;
    },
    async (file, name) => {
      await fs.access(file);
      const existing = [...videos.values()].find((video) => video.path === file);
      if (existing) return existing;
      const video: VideoInfo = {
        id: randomUUID(),
        path: file,
        name,
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 120,
        size: 7,
        videoCodec: 'h264',
        bitDepth: '8',
        hasAudio: true,
        previewUrl: `verti-media://local/${randomUUID()}`,
      };
      videos.set(video.id, video);
      return video;
    },
  );
}
function request(): ProjectSaveRequest {
  const id = [...videos.keys()][0]!;
  return {
    name: 'Interview',
    options,
    cuts: [
      { videoId: id, trim: { start: 2, end: 10 } },
      { videoId: id, trim: { start: 40, end: 55 } },
    ],
  };
}
beforeEach(async () => {
  directory = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'verti-project-test-')));
  root = path.join(directory, 'projects');
  original = path.join(directory, 'interview.mp4');
  await fs.writeFile(original, 'footage');
  const id = randomUUID();
  videos = new Map([
    [
      id,
      {
        id,
        path: original,
        name: 'interview.mp4',
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        size: 7,
        videoCodec: 'h264',
        bitDepth: '8',
        hasAudio: true,
        previewUrl: 'original-session',
      },
    ],
  ]);
});
afterEach(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

describe('Saved video projects', () => {
  it('copies shared footage once and restores multiple cuts after a restart without the original', async () => {
    const saved = await repository().save(request());
    const files = await fs.readdir(path.join(root, saved.id));
    expect(files).toHaveLength(2);
    await fs.unlink(original);
    videos.clear();
    const restarted = repository(false);
    expect(await restarted.list()).toEqual([saved]);
    const opened = await restarted.open(saved.id);
    expect(opened.options).toEqual(options);
    expect(opened.cuts.map((cut) => cut.trim)).toEqual([
      { start: 2, end: 10 },
      { start: 40, end: 55 },
    ]);
    expect(opened.cuts[0]?.video.id).toBe(opened.cuts[1]?.video.id);
    expect(opened.cuts[0]?.video.name).toBe('interview.mp4');
    expect(path.extname(opened.cuts[0]!.video.path)).toBe('.mp4');
    expect(await fs.readFile(opened.cuts[0]!.video.path, 'utf8')).toBe('footage');
  });
  it('updates drafts without recopying footage, including after reopening', async () => {
    const repo = repository();
    const saved = await repo.save(request());
    const edited = request();
    edited.id = saved.id;
    edited.cuts[0]!.trim.end = 15;
    await repo.save(edited);
    const opened = await repo.open(saved.id);
    await repo.save({
      id: saved.id,
      name: 'Renamed',
      options,
      cuts: opened.cuts.map((cut) => ({ videoId: cut.video.id, trim: cut.trim })),
    });
    expect(await fs.readdir(path.join(root, saved.id))).toHaveLength(2);
    expect((await repo.open(saved.id)).name).toBe('Renamed');
    expect((await repo.open(saved.id)).cuts[0]?.trim.end).toBe(15);
  });
  it('round-trips the option to export both aspect ratios', async () => {
    const repo = repository();
    const saved = await repo.save({ ...request(), options: { ...options, both: true } });
    const opened = await repo.open(saved.id);
    expect(opened.options.both).toBe(true);
    expect(opened.options.fit).toBe('crop');
  });
  it('saves clearing all cuts and can autosave using managed footage after the original is moved', async () => {
    const repo = repository();
    const initial = request();
    const saved = await repo.save(initial);
    await fs.unlink(original);
    await repo.save({
      ...initial,
      id: saved.id,
      cuts: [{ ...initial.cuts[0]!, trim: { start: 1, end: 5 } }],
    });
    expect((await repo.open(saved.id)).cuts[0]?.trim).toEqual({ start: 1, end: 5 });
    await repo.save({ ...initial, id: saved.id, cuts: [] });
    expect((await repo.open(saved.id)).cuts).toEqual([]);
    expect(await fs.readdir(path.join(root, saved.id))).toHaveLength(2);
  });
  it('keeps the last saved document if new footage cannot be saved', async () => {
    const repo = repository();
    const saved = await repo.save(request());
    const video = [...videos.values()][0]!;
    const invalid = { ...video, id: randomUUID(), path: path.join(directory, 'missing.mp4') };
    videos.set(invalid.id, invalid);
    await expect(
      repo.save({
        ...request(),
        id: saved.id,
        cuts: [{ videoId: invalid.id, trim: { start: 0, end: 2 } }],
      }),
    ).rejects.toThrow();
    expect((await repo.open(saved.id)).cuts).toHaveLength(2);
  });
  it('rejects unapproved sources, traversal IDs, and cuts past the end', async () => {
    await expect(repository(false).save(request())).rejects.toThrow('allowed');
    await expect(repository().open('../outside')).rejects.toThrow();
    const invalid = request();
    invalid.cuts[0]!.trim.end = 999;
    await expect(repository().save(invalid)).rejects.toThrow();
    expect(await repository().list()).toEqual([]);
  });
  it('rejects a project source symlink pointing outside approved storage', async () => {
    const saved = await repository().save(request());
    const document = JSON.parse(
      await fs.readFile(path.join(root, saved.id, 'project.json'), 'utf8'),
    );
    const source = path.join(
      root,
      saved.id,
      document.sources[0].key + document.sources[0].extension,
    );
    await fs.unlink(source);
    await fs.symlink(original, source);
    videos.clear();
    await expect(repository(false).open(saved.id)).rejects.toThrow('allowed');
  });
});
