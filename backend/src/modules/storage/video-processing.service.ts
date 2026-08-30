import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { statSync } from 'fs';
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

export interface VideoRendition {
  quality: string;
  filePath: string;
  fileSize: number;
}

export interface ProcessVideoResult {
  variants: VideoRendition[];
  thumbnailPath: string;
}

interface QualityTarget {
  name: string;
  height: number;
  videoBitrate: string;
}

/** Renditions generated for an evidence video, largest first. Renditions
 * taller than the source are skipped to avoid upscaling. */
const QUALITY_LADDER: QualityTarget[] = [
  { name: '1080p', height: 1080, videoBitrate: '5000k' },
  { name: '720p', height: 720, videoBitrate: '2800k' },
  { name: '480p', height: 480, videoBitrate: '1400k' },
];

@Injectable()
export class VideoProcessingService {
  private readonly logger = new Logger(VideoProcessingService.name);

  async probe(
    filePath: string,
  ): Promise<{ width: number; height: number; durationSeconds: number }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === 'video',
        );
        resolve({
          width: videoStream?.width ?? 0,
          height: videoStream?.height ?? 0,
          durationSeconds: metadata.format.duration ?? 0,
        });
      });
    });
  }

  /**
   * Transcodes a source video into multiple quality renditions plus a
   * thumbnail frame. Renditions taller than the source resolution are
   * skipped; if none qualify, the source's own height is transcoded as a
   * single "source" quality rendition so at least one output always exists.
   */
  async transcode(
    sourcePath: string,
    outputDir: string,
    baseName: string,
  ): Promise<ProcessVideoResult> {
    const { height: sourceHeight } = await this.probe(sourcePath);

    const targets = QUALITY_LADDER.filter(
      (target) => target.height <= sourceHeight,
    );
    if (targets.length === 0) {
      targets.push({
        name: 'source',
        height: sourceHeight,
        videoBitrate: '2000k',
      });
    }

    const variants: VideoRendition[] = [];
    for (const target of targets) {
      const filePath = `${outputDir}/${baseName}_${target.name}.mp4`;
      await this.transcodeOne(sourcePath, filePath, target);
      variants.push({
        quality: target.name,
        filePath,
        fileSize: statSync(filePath).size,
      });
    }

    const thumbnailPath = `${outputDir}/${baseName}_thumb.jpg`;
    await this.extractThumbnail(sourcePath, thumbnailPath);

    this.logger.log(
      `Transcoded ${baseName}: ${variants.map((v) => v.quality).join(', ')}`,
    );

    return { variants, thumbnailPath };
  }

  private transcodeOne(
    sourcePath: string,
    outputPath: string,
    target: QualityTarget,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`?x${target.height}`)
        .videoBitrate(target.videoBitrate)
        .outputOptions(['-movflags +faststart'])
        .on('error', reject)
        .on('end', () => resolve())
        .save(outputPath);
    });
  }

  private extractThumbnail(
    sourcePath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(sourcePath)
        .on('error', reject)
        .on('end', () => resolve())
        .screenshots({
          count: 1,
          timemarks: ['1'],
          filename: outputPath.split('/').pop(),
          folder: outputPath.substring(0, outputPath.lastIndexOf('/')),
        });
    });
  }
}
