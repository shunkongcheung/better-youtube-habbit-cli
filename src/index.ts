import fs from "fs";

import { getCommands } from "./commands";
import { runInteractive } from "./interactive";
import { storeVideoDetails } from "./store";
import { getVideoIds, getVideoDetails, IVideoDetail } from "./youtube";

interface  IProps { 
  channels: string[]
  fromDate: Date;
  toDate: Date;
}

const readChannelFile = (channelFilepath: string) => {
  const channelsStr = fs.readFileSync(channelFilepath, { encoding: 'utf8'})
  return JSON.parse(channelsStr);
}


const getDailyVideoDetails = async ({ channels, fromDate, toDate}: IProps) => {
  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  console.log(`Fetching data from ${fromDate} to ${toDate}`);
  console.log(`Start fetching video ID for ${channels.length} channel(s).`);
  for(let idx = 0; idx < channels.length; idx ++) {
    const channelId = channels[idx];
    const videoIds = await getVideoIds(channelId);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const filteredVideoDetails = videoDetails
    .filter(item => !!item)
    .filter(item => {
      const videoDate = new Date(item.uploadDate);
      return toDate >= videoDate && videoDate > fromDate;
    });

    videoDetailsMap[channelId] = filteredVideoDetails;
    console.log(`[(${idx+1}/${channels.length})${channelId}] fetched ${filteredVideoDetails.length} video.`);
  }

  return videoDetailsMap;
}

(async () => {
  const { isInteractive, ... rest } = getCommands();

  const { channelFilepath, outputDir, fromDate, toDate } = isInteractive ? await runInteractive(): rest

  if(!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
  }

  const channels = readChannelFile(channelFilepath);
  const videoDetailsMap = await getDailyVideoDetails({ channels, fromDate, toDate });

  const filteredVideoDetailsMap: Record<string, IVideoDetail[]> = {};
  Object.keys(videoDetailsMap).forEach(channelId => {
    if(videoDetailsMap[channelId] && videoDetailsMap[channelId].length) {
      filteredVideoDetailsMap[channelId] = videoDetailsMap[channelId];
    }
  });

  await storeVideoDetails(filteredVideoDetailsMap, outputDir);
})();
