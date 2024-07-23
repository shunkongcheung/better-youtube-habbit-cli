import fs from "fs";

import { getCommands } from "./commands";
import { runInteractive } from "./interactive";
import { storeVideoDetails } from "./store";
import { getChannelVideoIds, getPlayListVideoIds, getVideoDetails, IVideoDetail } from "./youtube";

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
    const videoIds = await getChannelVideoIds(channelId);
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

const getVideoDetailsFromVideoIds = async (videoIds: string[]) => {
  const videoDetails = await Promise.all(videoIds.map(getVideoDetails));
  const filteredVideoDetails = videoDetails.filter(item => !!item);
    
  filteredVideoDetails.forEach((item, index) => {
    const renameWithIndex = `${index+1} - ${item.title}`;
    item.title = renameWithIndex;
  });
  return filteredVideoDetails;
}

const getPlayListVideoDetails = async (playlistId: string) => {
  console.log(`Start fetching playlist ID ${playlistId}.`);
  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  const videoIds = await getPlayListVideoIds(playlistId);
  const filteredVideoDetails = await getVideoDetailsFromVideoIds(videoIds);

  videoDetailsMap[playlistId] = filteredVideoDetails;
  console.log(`Fetched ${filteredVideoDetails.length} video.`);

  return videoDetailsMap;
}

(async () => {
  const { isInteractive, playlistId, videoId, ... rest } = getCommands();
  const hasDesignatedTarget = !!(playlistId || videoId);

  const { channelFilepath, outputDir, fromDate, toDate } = !(hasDesignatedTarget) && isInteractive
    ? await runInteractive()
    : rest;

    if(!fs.existsSync(outputDir)){
      fs.mkdirSync(outputDir);
    }

    const channels = !playlistId ? readChannelFile(channelFilepath): [];
    const videoDetailsMap = videoId
    ? { [videoId]: await getVideoDetailsFromVideoIds([videoId]) }
      : playlistId
      ? await getPlayListVideoDetails(playlistId)
      : await getDailyVideoDetails({ channels, fromDate, toDate });

      const filteredVideoDetailsMap: Record<string, IVideoDetail[]> = {};
      Object.keys(videoDetailsMap).forEach(channelId => {
        if(videoDetailsMap[channelId] && videoDetailsMap[channelId].length) {
          filteredVideoDetailsMap[channelId] = videoDetailsMap[channelId];
        }
      });

      await storeVideoDetails(filteredVideoDetailsMap, outputDir);
})();
