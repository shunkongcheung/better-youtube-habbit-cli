import { program } from "commander";

import { IControl } from "./control.type";
import { getAugmentedDate, getDateAtStdTime } from "./date";
import { LogLevel, ILogger } from "./logger";

interface ICommandResult extends IControl {
  isInteractive: boolean;
  playlistId: string;
  videoId: string;
}

const LOG_LOCATION = "Command"

export const getCommands = (logger: ILogger): ICommandResult => {
  logger(LogLevel.debug, LOG_LOCATION, "Begin");

  program
  .name("better-youtube-habbiti-cli")
  .description("CLI to download youtube video. By default run daily job.")
  .version("1.0.0");

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  program
  .option('-c --channelFilepath <channelFilepath>', 'Channels file', './channels.json')
  .option(
    '-f --fromDate <fromDate>',
    'Downloading from this date(yyyy-mm-dd).',
    (dateStr: string) => getAugmentedDate(dateStr),
    yesterday.toISOString().split("T")[0]
  )
  .option('-i --interactive', 'Start interactive interface.')
  .option('-p --playlistId <playlistId>', 'Playlist ID.', "")
  .option('-o --outputDir <outputDir>', 'Directory to outputs.', './outputs')
  .option(
    '-t --toDate <toDate>',
    'Downloading until this date(yyyy-mm-dd).',
    (dateStr: string) => getAugmentedDate(dateStr),
    today.toISOString().split("T")[0]
  )
  .option('-v --videoId <videoId>', 'Video ID.', "")
  ;
  
  program.parse();

  const options = program.opts();
  logger(LogLevel.debug, LOG_LOCATION, JSON.stringify(options));

  const channelFilepath = options.channelFilepath;
  logger(LogLevel.debug, LOG_LOCATION, "channelFilePath", channelFilepath);

  const fromDate = getDateAtStdTime(options.fromDate);
  logger(LogLevel.debug, LOG_LOCATION, "fromDate", fromDate);

  const isInteractive = options.interactive;
  logger(LogLevel.debug, LOG_LOCATION, "isInteractive", isInteractive);

  const playlistId = options.playlistId;
  logger(LogLevel.debug, LOG_LOCATION, "playlistId", playlistId);

  const outputDir = options.outputDir;
  logger(LogLevel.debug, LOG_LOCATION, "outputDir", outputDir);

  const toDate = getDateAtStdTime(options.toDate);
  logger(LogLevel.debug, LOG_LOCATION, "toDate", toDate);

  const videoId = options.videoId;
  logger(LogLevel.debug, LOG_LOCATION, "videoId", videoId);

  logger(LogLevel.debug, LOG_LOCATION, "Finished");
  return { channelFilepath, isInteractive, playlistId, outputDir,fromDate, toDate, videoId };
}
