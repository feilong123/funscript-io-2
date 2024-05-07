import { Action, Funscript } from "./types";
import { getSpeed, roundAction } from "./utils";

/**
 * Converts a JSON string into a funscript object, computes metadata, and performs cleanup
 * @param  {string} funscriptJson - JSON string to be converted into a funscript object
 * @returns Converted funscript object
 */
export const getFunscriptFromString = (funscriptJson: string): Funscript => {
    const script = JSON.parse(funscriptJson);
    return addFunscriptMetadata(script);
};
/**
 * Adds metadata (average speed and duration) to a funscript, as well as make sure that its actions are in the right order (and deletes the accursed rawActions)
 * @param  {Funscript} funscript - Funscript to be processed
 * @returns Processed funscript with metadata
 */
export const addFunscriptMetadata = (funscript: Funscript): Funscript => {
    const output: Funscript = { ...funscript };

    output.actions = output.actions.sort((a: Action, b: Action) => a.at - b.at).map(roundAction);
    const duration = output.actions.slice(-1)[0].at;
    // 平均速度
    const averageSpeed =
        output.actions.reduce((acc, action, index) => {
            if (index === 0) return acc;
            const speed = getSpeed(output.actions[index - 1], output.actions[index]);
            return acc + speed;
        }, 0) /
        (output.actions.length - 1);
    
    // 最大速度 打印最大速度 以及 最大速度的的action.at
    const maxSpeedData = output.actions.reduce((acc, action, index) => {
        if (index === 0) return acc;
        const speed = getSpeed(output.actions[index - 1], output.actions[index]);
        if (speed > acc.maxSpeed) {
            return { maxSpeed: speed, maxSpeedAt: action.at };
        } else {
            return acc;
        }
    }, { maxSpeed: 0, maxSpeedAt: null });

    const maxSpeed = maxSpeedData.maxSpeed;
    
    console.log(`最大速度: ${maxSpeedData.maxSpeed}`);
    console.log(`最大速度的action.at: ${maxSpeedData.maxSpeedAt}`);

    // 最小速度
    const minSpeed = output.actions.reduce((acc, action, index) => {
        if (index === 0) return acc;
        const speed = getSpeed(output.actions[index - 1], output.actions[index]);
        return Math.min(acc, speed);
    }, 0);

    output.metadata = {
        ...output.metadata,
        duration,
        average_speed: averageSpeed,
        max_speed: maxSpeed,
        min_speed: minSpeed,
    };
    if ((output as any).rawActions) delete (output as any).rawActions;
    return output;
};

/**
 * Converts a funscript into a CSV blob suitable for upload to a Handy
 * @param  {string} funscript - Funscript to be converted
 * @returns Plaintext blob ready to be uploaded to a Handy
 */
export const convertFunscriptToCsvBlob = (funscript: string): Blob => {
    const script = JSON.parse(funscript);
    const csv = script.actions
        .map((action: Action) => {
            const roundedAction = roundAction(action);
            return roundedAction.at + "," + roundedAction.pos;
        })
        .join("\n");
    const csvBlob = new Blob([csv], {
        type: "text/plain",
    });

    return csvBlob;
};

/**
 * Converts a funscript into a list of time/action pairs, ready to be turned into a CSV
 * @param  {Funscript} funscript - Funscript to be converted
 * @returns Plaintext blob ready to be uploaded to a Handy
 */
export const convertFunscriptToCsv = (funscript: Funscript): [number, number][] => {
    return funscript.actions.map((action: Action) => [
        Math.round(action.at),
        Math.round(action.pos),
    ]);
};

/** Converts a .csv file of the format time(ms),pos(0-100) into a funscript.  */
export const convertCsvToFunscript = (csv: string, title?: string): Funscript => {
    const script: Funscript = {
        actions: [],
    };
    const lines = csv.split("\n");
    lines.forEach(line => {
        if (line.length === 0) return;
        const pieces = line.split(",");
        if (pieces.length !== 2) return;
        const [time, pos] = pieces;
        script.actions.push({ at: parseInt(time), pos: parseInt(pos) });
    });
    if (title) {
        script.metadata = {
            title: title.replace(".csv", ""),
        };
    }
    return script;
};
