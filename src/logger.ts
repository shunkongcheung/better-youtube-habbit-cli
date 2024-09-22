export enum LogLevel {
  debug = "debug",
  info = "info",
  error = "error",
}

export type ILogger = (
  level: LogLevel,
  location: string,
  message: string,
  value?: unknown,
) => void;

export const getLogger = (logLevel?: LogLevel): ILogger => {
  const logKeys = Object.values(LogLevel);
  const logLevelIndex = logKeys.findIndex(
    (item) => item === (logLevel || LogLevel.info),
  );

  const callback: ILogger = (level, location, message, value) => {
    const curLevelIndex = logKeys.findIndex((item) => item === level);
    const isToLog = curLevelIndex >= logLevelIndex;
    if (!isToLog) {
      return;
    }

    const time = new Date();
    console.log(
      `${time.toLocaleTimeString()} [${location}]: ${message}`,
      value ? JSON.stringify(value) : "",
    );
  };

  return callback;
};
