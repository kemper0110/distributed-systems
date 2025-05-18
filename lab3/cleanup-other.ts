import {exec} from "child_process";

for (let i = 0; i < 4; ++i) {
    const nodeName = `data-node-${i}`

    console.log(`Stopping container ${nodeName}...`);
    exec(`docker stop ${nodeName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping container ${nodeName}:`, error);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);


        console.log(`Removing container ${nodeName}...`);
        exec(`docker rm ${nodeName}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error removing container ${nodeName}:`, error);
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    });
}