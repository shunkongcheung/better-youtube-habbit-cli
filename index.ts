import clear from "clear";
import { program } from "commander";
import fetch from "cross-fetch";
import fs from "fs";
import * as inquirer from '@inquirer/prompts';
import sanitize from "sanitize-filename";
import ytdl from 'ytdl-core';

import { channels, ChannelType } from "./channels";

interface IVideoDetail {
  videoId: string;
  lengthSeconds: string;
  title: string;
  thumbnail: string,
  uploadDate: string;
}

const getUnique = (arr: string[]) => [...new Set(arr)];

const getUrlFromId = (videoId: string) =>  `http://www.youtube.com/watch?v=${videoId}`;

function slugify(title: string) {
  return sanitize(title);
}

const getAugmentedDate = (dateStr: string) => {
  // setHours would set date to previous date if original Date was in 00:00AM.
  // this function is used in commander option parsing only
  return `${dateStr} 11:00 AM`
};

const getDateAtStdTime = (dateOriginal: Date | string) => {
    const result = new Date(dateOriginal);
    result.setHours(7, 0, 0, 0);
    return result;
}

const getVideoIds = async (channel: string) => {
  const url = `https://www.youtube.com/${channel}/videos`;
    const response = await fetch(url);
  const body = await response.text();

  const result = body.match(/ytInitialData = {.*};<\/script>/)[0];
  const rawVideoIds = [...result.matchAll(/"videoId":"(.{1,16})","/g)];

  const videoIds = rawVideoIds.map(result => result[1]);

  return getUnique(videoIds);
}


const getVideoDetails = async (videoId: string): Promise<IVideoDetail> => {
  const url = getUrlFromId(videoId);
  try {
  const { videoDetails } = await ytdl.getBasicInfo(url)
  return {
    videoId,
    lengthSeconds: videoDetails.lengthSeconds,
    title: videoDetails.title,
    thumbnail: videoDetails.thumbnails[0]?.url,
    uploadDate: videoDetails.uploadDate,
  };
  }catch(err) {
    return null;
  }
}

const storeVideo = async (videoId: string, filename: string) => {
  const isExist = fs.existsSync(filename);
  if(isExist) {
    return;
  }

  const url = getUrlFromId(videoId);
  return new Promise((resolve, reject) => {
    ytdl(url)
    .on('finish', () => resolve(""))
    .on('error', (err: Error) => reject(err))
    .pipe(fs.createWriteStream(filename, { flags: 'a+' }));
  });

}

const getVideoTypeFromPrompt = async () => {
  const choices = Object.values(ChannelType).map(channelType => ({ name: channelType, value: channelType, checked: true }));

  const answer = await inquirer.checkbox({
    message: "What video type would you like to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getChannelFromPrompt = async (channelTypes: ChannelType[]) => {
  const channelInTypes = channels.filter(({ types }) => types.some(type => channelTypes.some(channelType => channelType === type)));
  const choices = channelInTypes.map(channel => ({ name: channel.id, value: channel.id, checked: true }));

  const answer = await inquirer.checkbox({
    message: "Which channel would you want to fetch?",
    choices,
    pageSize: choices.length,
  });

  return answer;
}

const getVideoDetailsFromPrompt = async (videoDetails: IVideoDetail[]) => {
  const choices = videoDetails.map(video => ({
    name: video.title,
    value: video.videoId,
    descrption: video.thumbnail,
    checked: true
  }));

  const answer = await inquirer.checkbox({
    message: "Which video would you like to download?",
    choices,
    loop: false,
    pageSize: 10,
  });

  return videoDetails.filter(item => answer.includes(item.videoId));
}

const runInteractive = async () => {
  clear(); // clear terminal

  const videoTypes = await getVideoTypeFromPrompt();
  const channels = await getChannelFromPrompt(videoTypes);

  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  for(let idx = 0; idx < channels.length; idx ++) {
    const channel = channels[idx];
    const videoIds = await getVideoIds(channel);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const filteredVideoDetails = videoDetails.filter(item => !!item);
    const confirmedDetails = await getVideoDetailsFromPrompt(filteredVideoDetails);

    videoDetailsMap[channel] = confirmedDetails;
  }

  return videoDetailsMap;
}

const getDailyVideoDetails = async ({fromDate, toDate}: { fromDate: Date, toDate: Date }) => {
  const videoDetailsMap: Record<string, IVideoDetail[]> = {};

  console.log(`Fetching data from ${fromDate} to ${toDate}`);
  console.log(`Start fetching video ID for ${channels.length} channel(s).`);
  for(let idx = 0; idx < channels.length; idx ++) {
    const channel = channels[idx];
    const videoIds = await getVideoIds(channel.id);
    const videoDetails = await Promise.all(videoIds.map(getVideoDetails));

    const filteredVideoDetails = videoDetails
    .filter(item => !!item)
    .filter(item => {
      const videoDate = new Date(item.uploadDate);
      return toDate >= videoDate && videoDate > fromDate;
    });

    videoDetailsMap[channel.id] = filteredVideoDetails;
    console.log(`[(${idx+1}/${channels.length})${channel.id}] fetched ${filteredVideoDetails.length} video.`);
  }

  return videoDetailsMap;
}

const storeVideoDetails = async (videoDetailsMap: Record<string, IVideoDetail[]>, outputDir: string) => {
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
      const { videoId, title } = videoDetails[jdx];
      const videoFileName = `${slugify(title)}.mp4`;
      const videoDisplayName = `(${jdx+1}/${videoDetails.length}) ${videoFileName}`;
      const videoFullpath =  `${outputDir}/${videoFileName}`;

      try {
        await storeVideo(videoId,videoFullpath);
        console.log(`${channelDisplayName}: completed ${videoDisplayName}`);
        channelSuccessCount ++;
      } catch (err){
        if(fs.existsSync(videoFullpath)) {
          fs.unlinkSync(videoFullpath);
        }
        console.log(`${channelDisplayName}: failed ${videoDisplayName}(${videoId}) - ${err}`);

      }
    }
    console.log(`${channelDisplayName}: completed ${channelSuccessCount}/${videoDetails.length} videos...`);
    totalSuccessCount += channelSuccessCount;
  }

  console.log(`Finished. completed ${totalSuccessCount} videos for all target channels`);
}



(async () => {
  program
  .name("better-youtube-habbiti-cli")
  .description(`CLI to download youtube video. By default run daily job.`)
  .version("1.0.0");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  program.option('-i --interactive', 'Start interactive interface.');
  program.option('-o --outputDir', 'Directory to outputs.', './outputs');
  program.option(
    '-f --fromDate <fromDate>',
    'Downloading from this date(yyyy-mm-dd).',
    (dateStr: string) => getDateAtStdTime(getAugmentedDate(dateStr)),
    yesterday
  );
  program.option(
    '-t --toDate <toDate>',
    'Downloading until this date(yyyy-mm-dd).',
    (dateStr: string) => getDateAtStdTime(getAugmentedDate(dateStr)),
    today
  );
  program.parse();

  const options = program.opts();
  const isInteractive = options.interactive;
  const outputDir = options.outputDir;
  const fromDate = options.fromDate;
  const toDate = options.toDate;

  if(!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
  }

  const videoDetailsMap = isInteractive
    ? await runInteractive()
    : await getDailyVideoDetails({ fromDate, toDate });

  const filteredVideoDetailsMap: Record<string, IVideoDetail[]> = {};
  Object.keys(videoDetailsMap).forEach(channelId => {
    if(videoDetailsMap[channelId] && videoDetailsMap[channelId].length) {
      filteredVideoDetailsMap[channelId] = videoDetailsMap[channelId];
    }
  });

    await storeVideoDetails(filteredVideoDetailsMap, outputDir);
})();
