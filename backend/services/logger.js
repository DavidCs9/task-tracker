import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Emulate __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels with numeric values
export const LogLevel = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

class Logger {
  /**
   * @param {{ serviceName: string }} config
   */
  constructor(config) {
    this.config = config;
    this.minLevel = LogLevel.INFO;
    this.setMinLevel();
  }

  setMinLevel() {
    switch (process.env.NODE_ENV) {
      case "development":
        this.minLevel = LogLevel.TRACE;
        break;
      case "qa":
        this.minLevel = LogLevel.INFO;
        break;
      case "production":
        this.minLevel = LogLevel.WARN;
        break;
      default:
        this.minLevel = LogLevel.DEBUG;
    }
  }

  getLevelNumber(level) {
    const levels = {
      trace: LogLevel.TRACE,
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
      fatal: LogLevel.FATAL,
    };

    return levels[level.toLowerCase()] || LogLevel.INFO;
  }

  shouldLog(level) {
    const levelNumber = this.getLevelNumber(level);
    return levelNumber >= this.minLevel;
  }

  log(level, message, data = {}) {
    if (!this.shouldLog(level)) {
      return; // Skip logging if below minimum level
    }

    const levelNumber = this.getLevelNumber(level);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toLowerCase(),
      levelNumber,
      service: this.config.serviceName,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      logEntry.optional = data;
    }

    // Log to console
    console.log(logEntry);

    // Write to file if level is INFO or higher
    if (levelNumber >= LogLevel.INFO) {
      this.writeToFile(logEntry);
    }
  }

  writeToFile(logEntry) {
    // Assume rootDir is three levels up from current file
    const rootDir = path.join(__dirname, "..");

    const logsDir = path.join(rootDir, "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFileDate = new Date().toISOString().split("T")[0];
    const logPath = path.join(rootDir, "logs", `${logFileDate}.log`);
    fs.appendFile(logPath, JSON.stringify(logEntry) + "\n", (err) => {
      if (err) {
        console.error("Error writing to log file:", err);
      }
    });
  }

  trace(message, data) {
    this.log("trace", message, data);
  }

  debug(message, data) {
    this.log("debug", message, data);
  }

  info(message, data) {
    this.log("info", message, data);
  }

  warn(message, data) {
    this.log("warn", message, data);
  }

  error(message, data) {
    this.log("error", message, data);
  }

  fatal(message, data) {
    this.log("fatal", message, data);
  }
}

export default Logger;
