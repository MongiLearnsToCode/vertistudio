import { useCallback, useEffect, useRef, useState } from 'react';
import type { Trim } from '@shared/video/types';
import { timecode, parseTimecode } from '@shared/video/timecode';
import { trimRange } from '@shared/video/presets';
import { useLogger } from '@renderer/hooks/useLogger';
import type { QueueItem } from '../types';

export function useVideoCut(
  item: QueueItem,
  onTrim: (trim: Trim) => void,
  onValidity: (valid: boolean) => void,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState(item.video.previewUrl);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('Loading preview…');
  const [position, setPosition] = useState(item.trim.start);
  const [playing, setPlaying] = useState(false);
  const [inText, setInText] = useState(timecode(item.trim.start));
  const [outText, setOutText] = useState(timecode(item.trim.end));
  const [error, setError] = useState('');
  const attempted = useRef(false);
  const mounted = useRef(true);
  const playingCut = useRef(false);
  const trimRef = useRef(item.trim);
  const log = useLogger('VideoCut');
  useEffect(() => {
    trimRef.current = item.trim;
  }, [item.trim]);
  useEffect(() => {
    mounted.current = true;
    onValidity(true);
    return () => {
      mounted.current = false;
    };
  }, [onValidity]);
  const seek = useCallback(
    (value: number) => {
      const video = videoRef.current;
      if (!video || !ready) return;
      playingCut.current = false;
      video.pause();
      const time = Math.max(0, Math.min(item.video.duration, value));
      video.currentTime = time;
      setPosition(time);
    },
    [ready, item.video.duration],
  );
  const apply = useCallback(
    (trim: Trim, normalize = true): boolean => {
      try {
        trimRange(item.video, trim);
        setError('');
        onValidity(true);
        onTrim(trim);
        playingCut.current = false;
        videoRef.current?.pause();
        if (normalize) {
          setInText(timecode(trim.start));
          setOutText(timecode(trim.end));
        }
        return true;
      } catch {
        setError('Use valid times: 0 ≤ in < out ≤ video duration.');
        onValidity(false);
        return false;
      }
    },
    [item.video, onTrim, onValidity],
  );
  const editTime = (edge: 'start' | 'end', text: string) => {
    if (edge === 'start') setInText(text);
    else setOutText(text);
    const startText = edge === 'start' ? text : inText;
    const endText = edge === 'end' ? text : outText;
    const start =
      startText === timecode(item.trim.start) ? item.trim.start : parseTimecode(startText);
    const end = endText === timecode(item.trim.end) ? item.trim.end : parseTimecode(endText);
    apply({ start, end }, false);
  };
  const setPoint = (edge: 'start' | 'end') =>
    apply({ ...item.trim, [edge]: videoRef.current?.currentTime ?? position });
  const movePoint = (edge: 'start' | 'end', value: number) => {
    const gap = Math.min(1 / (item.video.fps || 30), item.trim.end - item.trim.start);
    const trim = {
      start: edge === 'start' ? Math.min(value, item.trim.end - gap) : item.trim.start,
      end: edge === 'end' ? Math.max(value, item.trim.start + gap) : item.trim.end,
    };
    if (apply(trim)) seek(trim[edge]);
  };
  const fallback = async () => {
    setReady(false);
    if (attempted.current) {
      setNote('Preview unavailable. You can still enter timecodes and export.');
      return;
    }
    attempted.current = true;
    setNote('Preparing a compatible preview… Longer videos can take a moment.');
    try {
      const response = await window.api.videoPreview({ id: item.video.id });
      if (!mounted.current) return;
      if (response.success) setSource(response.value);
      else {
        log.warn('Preview failed', { error: response.error });
        setNote(response.error);
      }
    } catch (issue) {
      log.error('Preview failed', issue);
      if (mounted.current)
        setNote('Could not prepare a preview. Timecode editing is still available.');
    }
  };
  const loaded = () => {
    setReady(true);
    setNote('Source preview · Export framing is selected at right');
    if (videoRef.current) videoRef.current.currentTime = item.trim.start;
  };
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !ready || error) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (video.currentTime < item.trim.start || video.currentTime >= item.trim.end)
      video.currentTime = item.trim.start;
    playingCut.current = true;
    try {
      await video.play();
    } catch (issue) {
      log.warn('Playback failed', { error: String(issue) });
      setNote('Playback could not start. Try seeking or preparing the preview again.');
    }
  };
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        if (playingCut.current && video.currentTime >= trimRef.current.end) {
          video.pause();
          video.currentTime = trimRef.current.end;
          playingCut.current = false;
        }
        setPosition(video.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const timelineRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!timeline.disabled)
        seek(
          (videoRef.current?.currentTime ?? 0) +
            Math.sign(event.deltaY || event.deltaX) / (item.video.fps || 30),
        );
    };
    timeline.addEventListener('wheel', wheel, { passive: false });
    return () => timeline.removeEventListener('wheel', wheel);
  }, [item.video.fps, seek]);
  return {
    videoRef,
    timelineRef,
    source,
    ready,
    note,
    position,
    playing,
    setPlaying,
    inText,
    outText,
    error,
    seek,
    editTime,
    setPoint,
    movePoint,
    fallback,
    loaded,
    togglePlay,
    syncPosition: () => setPosition(videoRef.current?.currentTime ?? 0),
    step: (direction: number) =>
      seek((videoRef.current?.currentTime ?? 0) + direction / (item.video.fps || 30)),
    clearPoint: (edge: 'start' | 'end') =>
      apply({ ...item.trim, [edge]: edge === 'start' ? 0 : item.video.duration }),
    clearPoints: () => apply({ start: 0, end: item.video.duration }),
  };
}
