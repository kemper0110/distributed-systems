import {setTimeout as $setTimeout} from "node:timers/promises";
import {read} from "node:fs";
import {nanoid} from "nanoid";

/*
    Слушаем ивенты от докера и обновляем список дата-нод
 */

const dockerDaemon = process.env.DOCKER_DAEMON || "http://localhost:2375";

// attach, commit, copy, create, destroy, detach, die, exec_create, exec_detach, exec_start, exec_die, export, health_status, kill, oom, pause, rename, resize, restart, start, stop, top, unpause, update, prune,
type ContainerEvent = {
    status: 'start' | 'kill' | 'stop' | 'die' | string, Actor: {
        ID: string
        Attributes: {
            name: string
            "lab2-container": "data-node" | "name-node"
        }
    }
}

function prettyPrintEvent(event: ContainerEvent) {
    const id = event.Actor.ID
    console.info(
        event.status,
        id.substring(0, 5) + '...' + event.Actor.ID.substring(id.length - 5, id.length),
        event.Actor.Attributes.name, event.Actor.Attributes["lab2-container"]
    );
}

export type DataNode = {
    origin: string
    name: string
}

export class DataNodes {
    containers: DataNode[] = []
    subscribers: Map<string, () => void> = new Map()
    constructor(containers?: DataNode[]) {
        if(containers)
            this.containers = containers
    }

    async forceUpdate() {
        console.log("containers list update")

        const url = new URL("/containers/json?" + new URLSearchParams({
            filters: JSON.stringify({
                label: ["lab2-container=data-node"]
            })
        }), dockerDaemon)
        console.log('fetching containers', url.toString())
        const response = await fetch(url);
        const data = await response.json();
        const containers = data.map(c => ({origin: process.env.CONTAINER_URL_PREFIX + c.Ports[0].PublicPort, name: c.Names[0]}));

        console.table(containers)
        this.set(containers)
    }


    protected async *listenEvents() {
        while(true) {
            try {
                const response = await fetch(new URL("/events?" + new URLSearchParams({
                    filters: JSON.stringify({
                        label: ["lab2-container=data-node"],
                        type: ["container"]
                    })
                }), dockerDaemon))
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let textBuffer = '';

                while (true) {
                    const {value, done} = await reader.read()
                    if (done) break;
                    textBuffer += decoder.decode(value, {stream: true})
                    const lines = textBuffer.split('\n')
                    textBuffer = lines.pop() // последняя строка может быть неполной

                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                yield JSON.parse(line) as ContainerEvent;
                            } catch (error) {
                                console.error('Failed to parse JSON:', error);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e)
                console.log('request error and timeout')
                await $setTimeout(1000)
            }
        }
    }

    async listen() {
        for await (const event of this.listenEvents()) {
            prettyPrintEvent(event)
            await this.forceUpdate()
        }
    }

    set(containers: DataNode[]) {
        this.containers = containers
        this.subscribers.forEach(cb => cb())
    }

    get(): readonly DataNode[] {
        return this.containers
    }

    subscribe(cb: () => void) {
        let key = nanoid()
        while(this.subscribers.has(key)) key = nanoid()
        this.subscribers.set(key, cb)
        return () => {
            this.subscribers.delete(key)
        }
    }
}

