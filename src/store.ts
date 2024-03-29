import fs from "fs";
import sanitize from "sanitize-filename";
import { getVideoStream, IVideoDetail } from "./youtube";

const slugify = (title: string) =>  sanitize(title);

interface IStoreResult {
  error: Error | null;
  isStored: boolean;
  videoFileName: string;
  videoFullpath: string;
}

const storeVideo = async (videoDetail: IVideoDetail, outputDir: string): Promise<IStoreResult> => {
  const videoFileName = `${slugify(videoDetail.title)}.mp4`;
  const videoFullpath =  `${outputDir}/${videoFileName}`;
  
  const result = { videoFileName, videoFullpath, isStored: false, error: null };

  const isExist = fs.existsSync(videoFullpath);
  if(isExist) {
    return result;
  }

  const stream = await getVideoStream(videoDetail.videoId);
  return new Promise((resolve) => {
    stream
    .on('finish', () => resolve({...result, isStored: true }))
    .on('error', (error: Error) => resolve({...result, error }))
    .pipe(fs.createWriteStream(videoFullpath, { flags: 'a+' }));
  });

}


export const storeVideoDetails = async (videoDetailsMap: Record<string, IVideoDetail[]>, outputDir: string) => {
  const targetChannels = Object.keys(videoDetailsMap);
  let totalSuccessCount = 0;
  const channelCount = targetChannels.length;
  console.log(`Fetching ${channelCount} channels...`);

  for(let idx = 0; idx < channelCount; idx ++) {
    const targetChannelId = targetChannels[idx];
    const videoDetails = videoDetailsMap[targetChannelId];

    const channelDisplayName = `[(${idx+1}/${channelCount})${targetChannelId}]`;

    let channelSuccessCount = 0;
    console.log(`${channelDisplayName}: fetching ${videoDetails.length} videos...`);

    for(let jdx = 0; jdx < videoDetails.length; jdx ++) {
      const videoDetail = videoDetails[jdx];

      const { videoFileName, videoFullpath, isStored, error } = await storeVideo(videoDetail, outputDir);
      const videoDisplayName = `(${jdx+1}/${videoDetails.length}) ${videoFileName}`;

      if(isStored) {
        console.log(`${channelDisplayName}: completed ${videoDisplayName}`);
        channelSuccessCount ++;
      } else if(!error) {
        console.log(`${channelDisplayName}: skipped ${videoDisplayName}`);
      } else {
        if(fs.existsSync(videoFullpath)) {
          fs.unlinkSync(videoFullpath);
        }
        console.log(`${channelDisplayName}: failed ${videoDisplayName}(${videoDetail.videoId}) - ${error}`);
      }
    }

    console.log(`${channelDisplayName}: completed ${channelSuccessCount}/${videoDetails.length} videos...`);
    totalSuccessCount += channelSuccessCount;
  }

  console.log(`Finished. completed ${totalSuccessCount} videos for all target channels`);
}
