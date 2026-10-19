import type { EncoderId, FitId, Trim, VideoInfo, VideoPreset, VideoFit } from './types';

export const PRESETS: VideoPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    tagline: 'Everyday uploads',
    detail: 'Around 3–5 Mbps. Clean on Wi-Fi and cellular, invisible after re-encode.',
    crf: 20,
    maxrate: '12M',
    bufsize: '24M',
    audio: '128k',
  },
  {
    id: 'quality',
    name: 'Quality',
    tagline: 'Recommended default',
    detail: 'Around 5–8 Mbps. Holds gradients and fine detail through TikTok’s re-encode.',
    crf: 16,
    maxrate: '14M',
    bufsize: '28M',
    audio: '192k',
  },
  {
    id: 'master',
    name: 'Max Detail',
    tagline: 'Heavy, near-lossless',
    detail: 'Around 10–14 Mbps. Protects grain and text; a much larger upload.',
    crf: 12,
    maxrate: '14M',
    bufsize: '28M',
    audio: '256k',
  },
];

export const FIT_MODES: VideoFit[] = [
  {
    id: 'keep',
    name: 'Original aspect ratio',
    detail: 'Keep the source aspect ratio and dimensions without cropping, padding, or scaling.',
  },
  {
    id: 'crop',
    name: 'Crop to 9:16',
    detail: 'Scale to fill 1080x1920 and trim the overflow from the centre.',
  },
  {
    id: 'pad',
    name: 'Pad to 9:16',
    detail: 'Scale to fit inside 1080x1920 and letterbox the remainder.',
  },
  {
    id: 'blur',
    name: 'Blur background',
    detail: 'Fit the frame and fill the gaps with a blurred copy of itself.',
  },
];

export const TARGET = { width: 1080, height: 1920 };

export function encoderLabel(id: EncoderId) {
  return (
    {
      libx264: 'Software (x264)',
      h264_nvenc: 'NVIDIA NVENC',
      h264_qsv: 'Intel Quick Sync',
      h264_vaapi: 'VAAPI',
    }[id] || id
  );
}

export function isVertical(probe: VideoInfo) {
  return probe.height > probe.width;
}

export function isExact(probe: VideoInfo) {
  return probe.width === TARGET.width && probe.height === TARGET.height;
}

export function geometryFor(fit: FitId, _probe: VideoInfo) {
  if (fit === 'keep') return { filters: [], changed: false };
  if (fit === 'crop') {
    return {
      changed: true,
      filters: [
        `scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=increase`,
        `crop=${TARGET.width}:${TARGET.height}`,
      ],
    };
  }

  if (fit === 'pad') {
    return {
      changed: true,
      filters: [
        `scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=decrease`,
        `pad=${TARGET.width}:${TARGET.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      ],
    };
  }

  if (fit === 'blur') {
    return {
      changed: true,
      filters: [
        'split=2[bg][fg]',
        `[bg]scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=increase,` +
          `crop=${TARGET.width}:${TARGET.height},boxblur=luma_radius=40:luma_power=2[bgblur]`,
        `[fg]scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=decrease[fgfit]`,
        '[bgblur][fgfit]overlay=(W-w)/2:(H-h)/2,setsar=1',
      ],
    };
  }

  return {
    changed: true,
    filters: [
      `scale=${TARGET.width}:${TARGET.height}:force_original_aspect_ratio=decrease`,
      `pad=${TARGET.width}:${TARGET.height}:(ow-iw)/2:(oh-ih)/2:color=black`,
      'setsar=1',
    ],
  };
}

function videoArgsFor(encoder: EncoderId, preset: VideoPreset) {
  const gop = 50;

  if (encoder === 'h264_nvenc') {
    return [
      '-c:v',
      'h264_nvenc',
      '-preset',
      'p6',
      '-tune',
      'hq',
      '-rc',
      'vbr',
      '-cq',
      String(Math.max(14, preset.crf - 1)),
      '-b:v',
      '0',
      '-maxrate',
      preset.maxrate,
      '-bufsize',
      preset.bufsize,
      '-profile:v',
      'high',
      '-g',
      String(gop),
      '-rc-lookahead',
      '32',
    ];
  }

  if (encoder === 'h264_qsv') {
    return [
      '-c:v',
      'h264_qsv',
      '-preset',
      'veryfast',
      '-global_quality',
      String(preset.crf),
      '-maxrate',
      preset.maxrate,
      '-bufsize',
      preset.bufsize,
      '-profile:v',
      'high',
      '-g',
      String(gop),
      '-look_ahead',
      '1',
    ];
  }

  if (encoder === 'h264_vaapi') {
    return [
      '-c:v',
      'h264_vaapi',
      '-rc_mode',
      'CQP',
      '-qp',
      String(preset.crf),
      '-maxrate',
      preset.maxrate,
      '-bufsize',
      preset.bufsize,
      '-profile:v',
      'high',
      '-g',
      String(gop),
    ];
  }

  return [
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-level',
    '4.2',
    '-preset',
    'slow',
    '-crf',
    String(preset.crf),
    '-maxrate',
    preset.maxrate,
    '-bufsize',
    preset.bufsize,
    '-pix_fmt',
    'yuv420p',
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
  ];
}

export function trimRange(probe: Pick<VideoInfo, 'duration'>, trim?: Trim) {
  const duration = Number(probe.duration);
  if (!trim) return { start: 0, end: duration, duration };
  const { start, end } = trim;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end > duration ||
    end <= start
  ) {
    throw new Error('Choose valid in and out points within the video duration.');
  }
  return { start, end, duration: end - start };
}

export function buildArgs({
  input,
  output,
  probe,
  preset,
  encoder,
  fit,
  keepFps = true,
  trim,
}: {
  input: string;
  output: string;
  probe: VideoInfo;
  preset: VideoPreset;
  encoder: EncoderId;
  fit: FitId;
  keepFps?: boolean;
  trim?: Trim;
}) {
  const range = trimRange(probe, trim);
  const geometry = geometryFor(fit, probe);
  const args = ['-hide_banner', '-n'];
  const isVaapi = encoder === 'h264_vaapi';
  if (isVaapi) args.push('-vaapi_device', '/dev/dri/renderD128');
  // Input seeking decodes from the preceding keyframe for accurate re-encoding.
  if (range.start > 0) args.push('-ss', String(range.start));
  args.push('-i', input);
  if (trim) args.push('-t', String(range.duration));
  const usesLabels = geometry.filters.some((f) => f.startsWith('['));
  args.push('-map', usesLabels ? '[vout]' : '0:v:0');

  if (probe.hasAudio) args.push('-map', '0:a:0');

  const filters = [];
  if (!keepFps && probe.fps && probe.fps > 0) {
    filters.push(probe.fps > 30 ? 'fps=30' : `fps=${Math.max(24, Math.round(probe.fps))}`);
  }

  if (usesLabels) {
    // The background and foreground are separate filter chains.
    const graph = '[0:v:0]' + geometry.filters.join(';');
    if (isVaapi) filters.push('format=nv12,hwupload');
    args.push('-filter_complex', `${graph}${filters.length ? ',' + filters.join(',') : ''}[vout]`);
  } else {
    filters.push(...geometry.filters);
    if (isVaapi) filters.push('format=nv12,hwupload');
    if (filters.length) args.push('-vf', filters.join(','));
  }
  args.push(...videoArgsFor(encoder, preset));
  if (!isVaapi && encoder !== 'libx264') args.push('-pix_fmt', 'yuv420p');

  if (probe.hasAudio) {
    args.push('-c:a', 'aac', '-b:a', preset.audio, '-ar', '48000', '-ac', '2');
  } else {
    args.push('-an');
  }

  args.push('-movflags', '+faststart');
  args.push('-map_metadata', '-1');
  args.push('-map_chapters', '-1');
  args.push('-progress', 'pipe:1');
  args.push('-nostats');
  args.push(output);

  return args;
}

export function effectiveFit(fit: FitId, video: Pick<VideoInfo, 'width' | 'height'>): FitId {
  if (fit !== 'auto') return fit;
  if (video.width === TARGET.width && video.height === TARGET.height) return 'keep';
  return video.height >= video.width ? 'crop' : 'blur';
}
