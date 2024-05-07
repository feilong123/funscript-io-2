import React, { useState } from "react";
import numeral from "numeral";
import Dropzone from "components/atoms/Dropzone";
import { notEmpty } from "lib/arrayUtils";
import { getFunscriptFromString } from "lib/funscript-utils/funConverter";
import { formatColor, getColor } from "lib/funscript-utils/funMapper";
import { Funscript } from "lib/funscript-utils/types";
import NumberField from "components/molecules/NumberField";
import FunscriptHeatmap from "components/molecules/FunscriptHeatmap";

const readFileAsync = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise<string>(resolve => {
        reader.onloadend = (e: ProgressEvent<FileReader>) => {
            if (!e.target) return;
            resolve(String(e.target.result));
        };
        reader.readAsText(file);
    });
};

interface FunscriptInfo {
    title: string;
    averageSpeed: number;
    maxSpeed: number;
    minSpeed: number;
    actionCount: number;
    duration: number;
    firstActionAt: number;
    funscript: Funscript;
}

const AppList = (): JSX.Element => {
    const [funscriptInfo, setFunscriptInfo] = useState<FunscriptInfo[]>([]);
    const [minLength, setMinLength] = useState(5);
    const [progress, setProgress] = useState<{
        done: number;
        todo: number;
        percent: number;
    }>({
        done: 0,
        todo: 0,
        percent: 1,
    });
    const [loading, setLoading] = useState(false);
    const [rendering, setRendering] = useState(false);
    const [hasFiles, setHasFiles] = useState(false);

    const handleFiles = async (files: File[]) => {
        setLoading(true);
        setHasFiles(true);
        const funscriptFiles = files.filter(f => f.name.split(".").slice(-1)[0] === "funscript");
        const funscripts: Funscript[] = [];
        for (let i = 0; i < funscriptFiles.length; i++) {
            setProgress({
                done: i,
                todo: funscriptFiles.length,
                percent: i / funscriptFiles.length,
            });
            const content = await readFileAsync(funscriptFiles[i]);
            try {
                const funscript = getFunscriptFromString(content);
                funscript.metadata = {
                    ...funscript.metadata,
                    title: funscriptFiles[i].name.replace(".funscript", ""),
                };
                funscripts.push(funscript);
                console.log("Got funscript from " + funscriptFiles[i].name, funscript.metadata);
            } catch (err: any) {
                console.error("Failed to get funscript from " + funscriptFiles[i].name, err);
            }
        }

        setRendering(true);

        await new Promise(resolve => setTimeout(resolve, 250));

        setFunscriptInfo(
            funscripts
                .map(f => {
                    // 第一个动作的时间 应该为第一个pos非50的 前一个动作的时间
                    let firstActionAt = 0;
                    for (let i = 0; i < f.actions.length; i++) {
                        if (f.actions[i].pos !== 50) {
                            firstActionAt = f.actions[i-1].at;
                            break;
                        }
                    }
                    return {
                        title: f.metadata?.title + '.funscript' || "" + '.funscript',
                        averageSpeed: f.metadata?.average_speed || 0,
                        maxSpeed: f.metadata?.max_speed || 0,
                        minSpeed: f.metadata?.min_speed || 0,
                        actionCount: f.actions.length || 0,
                        duration: f.actions.slice(-1)[0].at,
                        firstActionAt: firstActionAt,
                        funscript: f,
                    };
                })
                .filter(notEmpty)
                // .filter(f => f.duration >= minLength * 600)
                // .sort((a, b) => (a.averageSpeed || 0) - (b.averageSpeed || 0))
                // 文件名含有~simple的文件排在前面
                .sort((a, b) => {
                    if (a.title.includes("~simple") && !b.title.includes("~simple")) {
                        return -1;
                    }
                    if (!a.title.includes("~simple") && b.title.includes("~simple")) {
                        return 1;
                    }
                    return 0;
                })
        );

        setRendering(false);

        setProgress({ done: funscriptFiles.length, todo: funscriptFiles.length, percent: 1 });
        setLoading(false);
    };

    const FunscriptInfo = (info: FunscriptInfo): JSX.Element => {
        const color = getColor(info.averageSpeed || 0);
        const colorString = formatColor(color);
        return (
            <li className="flex flex-col border border-white rounded">
                <div className="w-full grid grid-cols-12 items-center h-8 text-sm px-4 border-b border-black">
                    <span className="col-span-4">{info.title}</span>
                    {/* <span className="text-right">
                        {numeral(info.duration / 1000).format("00:00:00")}
                    </span> */}
                    <span className="col-span-2">{numeral(info.firstActionAt / 1000).format("00:00:00")}</span>
                    <span className="col-span-2">{info.actionCount}</span>
                    <span className="col-span-2" style={{ color: colorString }}>
                        {Math.round(info.maxSpeed)} unit/s
                    </span>
                    {/* <span className="col-span-2" style={{ color: colorString }}>
                        {Math.round(info.minSpeed)} unit/s
                    </span> */}
                    <span className="col-span-2" style={{ color: colorString }}>
                        {Math.round(info.averageSpeed)} unit/s
                    </span>
                </div>
                <FunscriptHeatmap className="w-full h-8" funscript={info.funscript} />
            </li>
        );
    };

    return (
        <div>
            {loading ? (
                <p className="text-white grid place-items-center h-96 font-4xl">
                    {rendering
                        ? "Rendering Heatmaps"
                        : `Loading ${progress.done} / ${progress.todo}`}
                </p>
            ) : (
                <>
                    <p className="text-neutral-500 italic">
                        Drag funscripts from your PC here to sort them by average speed and render
                        heatmaps.
                        <br />
                        They are not uploaded or sent anywhere!
                    </p>
                    <Dropzone
                        className="my-4 h-16"
                        options={{
                            multiple: true,
                            onDropAccepted: handleFiles,
                        }}
                    >
                        <p>Drop files or folders</p>
                    </Dropzone>
                    {funscriptInfo && funscriptInfo.length > 0 ? (
                        <>
                            <NumberField
                                label="Min Length (min)"
                                value={minLength}
                                onChange={setMinLength}
                            />
                            <ul className="flex flex-col gap-2 mt-4 mb-8">
                                <li className="flex flex-col border border-black rounded">
                                    <div className="w-full grid grid-cols-12 items-center h-8 text-sm px-4 font-bold bg-neutral-800">
                                        <span className="col-span-4">Filename</span>
                                        <span className="col-span-2">firstActionAt</span>
                                        <span className="col-span-2">Action Count</span>
                                        {/* <span className="text-right">Duration</span> */}
                                        <span className="col-span-2">Max Speed</span>
                                        {/* <span className="col-span-2">Min Speed</span> */}
                                        <span className="col-span-2">Average Speed</span>
                                    </div>
                                </li>
                                {funscriptInfo.map(info => (
                                    <FunscriptInfo key={info.title} {...info} />
                                ))}
                            </ul>
                        </>
                    ) : (
                        hasFiles && (
                            <p className="text-white grid place-items-center h-96 font-4xl">
                                No funscripts in the files/folders you added
                            </p>
                        )
                    )}
                </>
            )}
        </div>
    );
};

export default AppList;
