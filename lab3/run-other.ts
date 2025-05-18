import {exec} from "child_process";
import path from "path";

const pwdWin = path.resolve("."); // абсолютный путь к текущей директории

for(let i = 1; i <= 4; ++i) {

    const nodeName = `data-node-${i}`
    const nodePort = 3000 + i
    const self = `http://host.docker.internal:${nodePort}`
    const blocksPath = `data-node-${i}-blocks`
    const isPioneer = false
    const mentor = `http://host.docker.internal:3000`

    const args = [
        "docker run -d",
        `--name ${nodeName}`,
        `--workdir /usr/app`,
        `-p ${nodePort}:3000`,
        `--network chord-net`,
        `--mount type=bind,source="${path.join(pwdWin, blocksPath)}",target=/usr/blocks`,
        `--mount type=bind,source="${pwdWin}",target=/usr/app,readonly`,
        `--env-file docker.env`,
        `-e SELF=${self}`,
        `-e IS_PIONEER=${isPioneer}`,
        `-e MENTOR=${mentor}`,
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
}
