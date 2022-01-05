const winston = require('winston');
const colors = require('colors');
const path = require('path');

class Logger {
    constructor(LoggingFile) {
        process.env.NODE_ENV === 'production' ? 
        this.logger = winston.createLogger(
            {
                transports: [
                    new winston.transports.File({ filename: LoggingFile })
                ],
            } 
        ) : null;
    }

    log(Text) {
        let d = new Date();
        process.env.NODE_ENV === 'production' ? 
            this.logger.log({
                level: "info",
                message:
                    `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} | Info: ` + Text,
            }) 
            : null;
        console.log(
            colors.green(
                `${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}`
            ) + colors.yellow(" | Info: " + Text)
        );
    }

    error(Text) {
        let d = new Date();
        process.env.NODE_ENV === 'production' ? 
            this.logger.error({
                level: "error",
                message:
                    `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} | Error: ` + Text,
            }) 
            : null;
        console.log(
            colors.red(
                `${d.getDate()}:${d.getMonth() + 1}:${d.getFullYear()} - ${d.getHours()}:${d.getMinutes()}`
            ) + colors.red(" | Error: " + Text)
        );
    }
}

const logger = new Logger(path.join(__dirname, 'Logs.log'));

function log(text) {
    logger.log(text)
}

function error(text) {
    logger.error(text)
}

module.exports = {
    log,
    error
}