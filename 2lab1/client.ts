import {Client} from "cassandra-driver";

export function createClient() {
    return new Client({
        contactPoints: ['localhost'],
        localDataCenter: 'datacenter1',
    });
}