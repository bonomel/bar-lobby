import { ResponseType, TachyonClient } from "tachyon-client";

import { TachyonSpadsBattle } from "@/model/battle/tachyon-spads-battle";
import { tachyonLog } from "@/utils/tachyon-log";

export class CommsAPI extends TachyonClient {
    constructor(config: ConstructorParameters<typeof TachyonClient>[0]) {
        super({
            ...config,
            verbose: true,
            logMethod: tachyonLog,
        });

        this.onConnect.add(() => {
            console.log(`Connected to ${config.host}:${config.port}`);
            api.session.offlineMode.value = false;

            this.socket?.on("close", () => {
                console.log(`Disconnected from ${config.host}:${config.port}`);
                api.session.offlineMode.value = true;
            });
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "server_restart") {
                api.session.offlineMode.value = true;

                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is restarting",
                });
            }
        });

        this.onResponse("s.system.server_event").add((data) => {
            if (data.event === "stop") {
                api.alerts.alert({
                    type: "notification",
                    severity: "warning",
                    content: "Server is shutting down",
                });
            }
        });

        this.onResponse("s.user.user_and_client_list").add(({ clients, users }) => {
            for (const client of clients) {
                updateUser(client.userid, undefined, client);
            }

            for (const user of users) {
                updateUser(user.id, user);
            }
        });

        this.onResponse("s.lobby.join_response").add((data) => {
            if (data.result === "approve") {
                // TODO: might need to request fresh client info here for cases where we don't already know about them (e.g. server forcing us into a battle)

                api.session.onlineBattle = new TachyonSpadsBattle({
                    ...data.lobby,
                    bots: data.bots,
                    modoptions: data.modoptions,
                });

                api.router.push("/multiplayer/battle");
            }
        });

        this.onResponse("s.lobby.updated").add((data) => {
            const battle = api.session.onlineBattle;
            if (!battle || data.lobby.id !== battle?.battleOptions.id) {
                console.warn("Not updating battle because it's not the current battle");
                return;
            }

            battle.handleServerResponse({
                ...data.lobby,
                bots: data.bots,
                modoptions: data.modoptions,
            });
        });

        this.onResponse("s.lobby.set_modoptions").add((data) => {
            const battle = api.session.onlineBattle;
            if (battle) {
                battle.handleServerResponse({
                    modoptions: data.new_options,
                });
            }
        });

        this.onResponse("s.lobby.updated_client_battlestatus").add(({ client }) => {
            updateUser(client.userid, undefined, client);
        });

        this.onResponse("s.lobby.add_user").add((data) => {
            const user = api.session.getUserById(data.joiner_id);
            const battle = api.session.getBattleById(data.lobby_id);
            if (user && battle) {
                // TODO: add player to battle
            }
        });
    }
}

function updateUser(userId: number, userStatus?: ResponseType<"s.user.user_and_client_list">["users"][0], battleStatus?: ResponseType<"s.lobby.updated_client_battlestatus">["client"]) {
    const user = api.session.getUserById(userId);
    if (user && userStatus) {
        user.clanId = userStatus.clan_id;
        user.username = userStatus.name;
        user.isBot = userStatus.bot;
        user.countryCode = userStatus.country;
        user.icons = userStatus.icons;
    }
    if (user && battleStatus) {
        user.battleStatus.away = battleStatus.away;
        user.battleStatus.battleId = battleStatus.lobby_id;
        user.battleStatus.inBattle = battleStatus.in_game;
        user.battleStatus.isSpectator = !battleStatus.player;
        user.battleStatus.sync = battleStatus.sync;
        user.battleStatus.teamId = battleStatus.team_number;
        user.battleStatus.playerId = battleStatus.player_number;
        user.battleStatus.color = battleStatus.team_colour;
        user.battleStatus.ready = battleStatus.ready;
    }
}
