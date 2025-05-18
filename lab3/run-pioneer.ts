import {exec} from "child_process";
import path from "path";

const pwdWin = path.resolve("."); // абсолютный путь к текущей директории

const nodeName = "data-node-0"
const nodePort = 3000
const blocksPath = "data-node-0-blocks"
const isPioneer = true

// Формируем команду docker run
const args = [
    "docker run -d",
    `--name ${nodeName}`,
    `--workdir /usr/app`,
    `-p ${nodePort}:3000`,
    `-p 9229:9229`,
    `--network chord-net`,
    `--mount type=bind,source="${path.join(pwdWin, blocksPath)}",target=/usr/blocks`,
    `--mount type=bind,source="${pwdWin}",target=/usr/app,readonly`,
    `--env-file docker.env`,
    `-e SELF=http://host.docker.internal:${nodePort}`,
    `-e IS_PIONEER=${isPioneer}`,
];

args.push("node:23-alpine npm run start:container");

const cmd = args.join(" ");

console.log(`Running: ${cmd}`);

exec(cmd, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error running container ${nodeName}:`, error);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
});