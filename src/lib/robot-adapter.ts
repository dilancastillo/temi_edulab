export type RobotCommand =
  | { type: "move"; steps: number }
  | { type: "say"; text: string }
  | { type: "show"; signal: "goal" | "alert" | "ready" }
  | { type: "audio"; clip: "confirm" | "bell" | "clap" };

export type RobotRunResult = {
  ok: boolean;
  message: string;
};

export interface RobotAdapter {
  name: string;
  run(commands: RobotCommand[]): Promise<RobotRunResult>;
}

export const temiV3DemoAdapter: RobotAdapter = {
  name: "Temi V3 demo adapter",
  async run(commands) {
    return {
      ok: true,
      message: `${commands.length} comandos validados en modo demo. El SDK de Temi V3 se conectará en la capa robot.`
    };
  }
};

