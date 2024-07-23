import fs from "fs";

import { getCommands } from "./commands";
import { ILogger, LogLevel, getLogger } from "./logger";
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


const getDailyVideoDetails = async ({ channels, fromDate, toDate}: IProps, logger:ILogger) => {
  const videoDetailsMap: Record<string, IVideoDetail[]> = {};
  const LOGGER_LOCTION = "getDailyVideoDetails";
  logger(LogLevel.debug, LOGGER_LOCTION, "Begin");
  logger(LogLevel.debug, LOGGER_LOCTION, "channels", channels);
  logger(LogLevel.debug, LOGGER_LOCTION, "fromDate", fromDate);
  logger(LogLevel.debug, LOGGER_LOCTION, "toDate", toDate);

  logger(LogLevel.info, LOGGER_LOCTION, `Fetching video ID for ${channels.length} channel(s).`, channels);
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
    logger(
      LogLevel.info,
      LOGGER_LOCTION, 
      `[(${idx+1}/${channels.length})${channelId}] fetched ${filteredVideoDetails.length} video.`
    );
  }

  return videoDetailsMap;
}

const getVideoDetailsFromVideoIds = async (videoIds: string[], logger: ILogger) => {
  const LOGGER_LOCTION = "getVideoDetailsFromVideoIds";
  logger(LogLevel.debug, LOGGER_LOCTION, "Begin");

  const videoDetails = await Promise.all(videoIds.map(getVideoDetails));
  logger(LogLevel.debug, LOGGER_LOCTION, "videoDetails", videoDetails);

  const filteredVideoDetails = videoDetails.filter(item => !!item);
  logger(LogLevel.debug, LOGGER_LOCTION, "filteredVideoDetails", filteredVideoDetails);
    
  filteredVideoDetails.forEach((item, index) => {
    const renameWithIndex = `${index+1} - ${item.title}`;
    item.title = renameWithIndex;
  });
  logger(LogLevel.debug, LOGGER_LOCTION, "filteredVideoDetails(renamed)", filteredVideoDetails);

  logger(LogLevel.debug, LOGGER_LOCTION, "Finished");
  return filteredVideoDetails;
}

const getPlayListVideoDetails = async (playlistId: string, logger: ILogger) => {
  const LOGGER_LOCTION = "getPlayListVideoDetails";
  logger(LogLevel.debug, LOGGER_LOCTION, "Begin");
  logger(LogLevel.debug, LOGGER_LOCTION, "playlistId", playlistId);

  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  const videoIds = await getPlayListVideoIds(playlistId);
  logger(LogLevel.debug, LOGGER_LOCTION, "videoIds", videoIds);

  const filteredVideoDetails = await getVideoDetailsFromVideoIds(videoIds, logger);

  videoDetailsMap[playlistId] = filteredVideoDetails;
  console.log(`Fetched ${filteredVideoDetails.length} video.`);
  logger(LogLevel.info, LOGGER_LOCTION, `Fetched ${filteredVideoDetails.length} videos for ${playlistId}`, {
    count: filteredVideoDetails.length,
    playlistId
  });

  logger(LogLevel.debug, LOGGER_LOCTION, "Finished");
  return videoDetailsMap;
}

(async () => {
  const LOGGER_LOCTION = "Root";
  const logger = getLogger();
  logger(LogLevel.debug, LOGGER_LOCTION, "Begin");

  const { isInteractive, playlistId, videoId, ... rest } = getCommands(logger);
  const hasDesignatedTarget = !!(playlistId || videoId);
  logger(LogLevel.debug, LOGGER_LOCTION, "hasDesignatedTarget", hasDesignatedTarget);

  const { channelFilepath, outputDir, fromDate, toDate } = !(hasDesignatedTarget) && isInteractive
    ? await runInteractive()
    : rest;
  logger(LogLevel.debug, LOGGER_LOCTION, "channelFilepath", channelFilepath);
  logger(LogLevel.debug, LOGGER_LOCTION, "outputDir", outputDir);
  logger(LogLevel.debug, LOGGER_LOCTION, "fromDate", fromDate);
  logger(LogLevel.debug, LOGGER_LOCTION, "toDate", toDate);

  if(!fs.existsSync(outputDir)){
    logger(LogLevel.debug, LOGGER_LOCTION, "filepath did not exists");
    fs.mkdirSync(outputDir);
    logger(LogLevel.debug, LOGGER_LOCTION, "filepath created");
  }

  const channels = !playlistId ? readChannelFile(channelFilepath): [];
  logger(LogLevel.debug, LOGGER_LOCTION, "channels", channels);

  const videoDetailsMap = videoId
  ? { [videoId]: await getVideoDetailsFromVideoIds([videoId], logger) }
    : playlistId
    ? await getPlayListVideoDetails(playlistId, logger)
    : await getDailyVideoDetails({ channels, fromDate, toDate }, logger);
  logger(LogLevel.debug, LOGGER_LOCTION, "videoDetailsMap", videoDetailsMap);

  const filteredVideoDetailsMap: Record<string, IVideoDetail[]> = {};
  Object.keys(videoDetailsMap).forEach(channelId => {
    if(videoDetailsMap[channelId] && videoDetailsMap[channelId].length) {
      filteredVideoDetailsMap[channelId] = videoDetailsMap[channelId];
    }
  });
  logger(LogLevel.debug, LOGGER_LOCTION, "filteredVideoDetailsMap", filteredVideoDetailsMap);

  await storeVideoDetails(filteredVideoDetailsMap, outputDir);

  logger(LogLevel.debug, LOGGER_LOCTION, "Finished");
})();
