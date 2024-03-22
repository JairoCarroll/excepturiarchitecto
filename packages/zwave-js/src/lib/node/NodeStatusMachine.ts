import { Interpreter, Machine, StateMachine } from "xstate";
import type { ZWaveNode } from "./Node";
import { NodeStatus } from "./Types";

/* eslint-disable @typescript-eslint/ban-types */
export interface NodeStatusStateSchema {
	states: {
		init: {};
		unknown: {};
		// non-sleeping nodes are either dead or alive
		dead: {};
		alive: {};
		// sleeping nodes are asleep or awake
		asleep: {};
		awake: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

const statusDict = {
	unknown: NodeStatus.Unknown,
	dead: NodeStatus.Dead,
	alive: NodeStatus.Alive,
	asleep: NodeStatus.Asleep,
	awake: NodeStatus.Awake,
} as const;
export function nodeStatusMachineStateToNodeStatus(
	state: Exclude<keyof NodeStatusStateSchema["states"], "init">,
): NodeStatus {
	return statusDict[state] ?? NodeStatus.Unknown;
}

export type NodeStatusEvent =
	| { type: "DEAD" }
	| { type: "ALIVE" }
	| { type: "ASLEEP" }
	| { type: "AWAKE" };

export type NodeStatusMachine = StateMachine<
	any,
	NodeStatusStateSchema,
	NodeStatusEvent
>;
export type NodeStatusInterpreter = Interpreter<
	any,
	NodeStatusStateSchema,
	NodeStatusEvent
>;

export function createNodeStatusMachine(node: ZWaveNode): NodeStatusMachine {
	return Machine<any, NodeStatusStateSchema, NodeStatusEvent>(
		{
			id: "nodeStatus",
			initial: "init",
			states: {
				init: {
					always: [
						{ target: "asleep", cond: "canSleep" },
						{ target: "unknown" },
					],
				},
				unknown: {
					on: {
						DEAD: {
							target: "dead",
							cond: "cannotSleep",
						},
						ALIVE: {
							target: "alive",
							cond: "cannotSleep",
						},
						ASLEEP: {
							target: "asleep",
							cond: "canSleep",
						},
						AWAKE: {
							target: "awake",
							cond: "canSleep",
						},
					},
				},
				dead: {
					on: {
						ALIVE: "alive",
					},
				},
				alive: {
					on: {
						DEAD: "dead",
						// GH#1054 we must have a way to send a node to sleep even if
						// it was previously detected as a non-sleeping device
						ASLEEP: {
							target: "asleep",
							cond: "canSleep",
						},
					},
				},
				asleep: {
					on: {
						AWAKE: "awake",
					},
				},
				awake: {
					on: {
						ASLEEP: "asleep",
					},
				},
			},
		},
		{
			guards: {
				canSleep: () => !!node.canSleep,
				cannotSleep: () => !node.canSleep,
			},
		},
	);
}
