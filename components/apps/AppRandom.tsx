import { useEffect, useState } from "react";
import { MdPause, MdPlayArrow, MdSkipNext } from "react-icons/md";
import Handy from "lib/thehandy";
import { HampState, HandyMode } from "lib/thehandy/types";
import RateLimitedSlider from "components/molecules/RateLimitedSlider";
import RateLimitedMinMaxSlider from "components/molecules/RateLimitedMinMaxSlider";
import ProgressRing from "components/atoms/CircularProgress";
import useAnim from "lib/hooks/useAnim";
import Mathf from "lib/Mathf";

type Range = {
    min: number;
    max: number;
};

const AppRandom = ({ handy }: { handy: Handy }): JSX.Element => {
    const [loading, setLoading] = useState(false);
    const [hampRunning, setHampRunning] = useState(false);
    const [hampVelocity, setHampVelocity] = useState(0);
    const [slideMin, setSlideMin] = useState(0);
    const [slideMax, setSlideMax] = useState(100);

    const [nextRandomTime, setNextRandomTime] = useState(0);
    const [lastRandomTime, setLastRandomTime] = useState(-1);
    const [progress, setProgress] = useState(0);
    const [skip, setSkip] = useState(false);

    const [randomInterval, setRandomInterval] = useState<Range>({
        min: 4,
        max: 15,
    });
    const [randomSpeed, setRandomSpeed] = useState<Range>({
        min: 0,
        max: 100,
    });
    const [randomSlide, setRandomSlide] = useState<Range>({
        min: 20,
        max: 100,
    });

    useAnim(
        (runTime: number, deltaTime: number) => {
            if (!hampRunning) {
                setLastRandomTime(cur => cur + deltaTime);
                setNextRandomTime(cur => cur + deltaTime);
                setProgress(0);
                return;
            }
            if (runTime > nextRandomTime || skip) {
                setLastRandomTime(runTime);
                setNextRandomTime(
                    runTime + Mathf.randomRange(randomInterval.min, randomInterval.max)
                );
                trySetHampVelocity(Math.round(Mathf.randomRange(randomSpeed.min, randomSpeed.max)));
                trySetSlideMin(
                    slideMax -
                        Math.round(Mathf.randomRange(randomSlide.min, randomSlide.max) * slideMax)
                );
                setSkip(false);
            }
            setProgress((runTime - lastRandomTime) / (nextRandomTime - lastRandomTime));
        },
        [
            nextRandomTime,
            lastRandomTime,
            randomInterval,
            randomSpeed,
            randomSlide,
            slideMax,
            hampRunning,
        ]
    );

    const [error, setError] = useState("");

    useEffect(() => {
        const initialization = async () => {
            try {
                setLoading(true);
                await handy.setMode(HandyMode.hamp);
                setHampVelocity(await handy.getHampVelocity());
                const slideSettings = await handy.getSlideSettings();
                setSlideMin(slideSettings.min);
                setSlideMax(slideSettings.max);
                setHampRunning((await handy.getStatus()).state === HampState.moving);
                setLoading(false);
            } catch (error: any) {
                setError(error.message);
            }
        };

        initialization();
    }, [handy]);

    const trySetHampVelocity = (value: number, fromSlider = true): void => {
        setError("");
        if (!fromSlider) setLoading(true);
        handy
            .setHampVelocity(value)
            .then(() => {
                if (fromSlider) return;
                setLoading(false);
                setHampVelocity(handy.hampVelocity);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    const trySetSlideMin = (value: number, fromSlider = true): void => {
        setError("");
        if (!fromSlider) setLoading(true);
        handy
            .setSlideMin(value)
            .then(() => {
                if (fromSlider) return;
                setLoading(false);
                setSlideMin(handy.slideMin);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    const trySetSlideMax = (value: number, fromSlider = true): void => {
        setError("");
        if (!fromSlider) setLoading(true);
        handy
            .setSlideMax(value)
            .then(() => {
                if (fromSlider) return;
                setLoading(false);
                setSlideMax(handy.slideMax);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    };

    const tryTogglePlay = () => {
        setError("");
        setLoading(true);
        if (hampRunning)
            handy
                .setHampStop()
                .then(() => {
                    setHampRunning(false);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
        else
            handy
                .setHampStart()
                .then(() => {
                    setHampRunning(true);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err.message);
                    setLoading(false);
                });
    };

    return (
        <div className="flex min-h-mobilemain md:min-h-main flex-col -mt-4 pb-5 pt-5 justify-between">
            <div className="flex flex-col gap-4">
                <div>
                    <div className="flex justify-between w-full">
                        <label className="text-sm text-white mb-0">Random Interval</label>
                        <p>
                            {Math.round(randomInterval.min)}s to {Math.round(randomInterval.max)}s
                        </p>
                    </div>
                    <RateLimitedMinMaxSlider
                        min={2}
                        max={30}
                        valueMin={randomInterval.min}
                        valueMax={randomInterval.max}
                        onChangeMin={val => setRandomInterval(cur => ({ ...cur, min: val }))}
                        onChangeMax={val => setRandomInterval(cur => ({ ...cur, max: val }))}
                    />
                </div>
                <div>
                    <div className="flex justify-between w-full">
                        <label className="text-sm text-white mb-0">Speed Range</label>
                        <p>
                            {Math.round(randomSpeed.min)}% to {Math.round(randomSpeed.max)}%
                        </p>
                    </div>
                    <RateLimitedMinMaxSlider
                        min={0}
                        max={100}
                        valueMin={randomSpeed.min}
                        valueMax={randomSpeed.max}
                        onChangeMin={val => setRandomSpeed(cur => ({ ...cur, min: val }))}
                        onChangeMax={val => setRandomSpeed(cur => ({ ...cur, max: val }))}
                    />
                </div>
                <div>
                    <div className="flex justify-between w-full">
                        <label className="text-sm text-white mb-0">Stroke Min Range</label>
                        <p>
                            {Math.round(randomSlide.min)}% to {Math.round(randomSlide.max)}% of
                            Stroke Max
                        </p>
                    </div>
                    <RateLimitedMinMaxSlider
                        min={0}
                        max={100}
                        valueMin={randomSlide.min}
                        valueMax={randomSlide.max}
                        onChangeMin={val => setRandomSlide(cur => ({ ...cur, min: val }))}
                        onChangeMax={val => setRandomSlide(cur => ({ ...cur, max: val }))}
                    />
                </div>
                <div>
                    <div className="flex justify-between w-full">
                        <label className="text-sm text-white mb-0">Stroke Max</label>
                        <p>{Math.round(slideMax)}%</p>
                    </div>
                    <RateLimitedSlider
                        min={0}
                        max={100}
                        value={slideMax}
                        disabled={loading}
                        onChange={setSlideMax}
                        onLimitedChange={trySetSlideMax}
                    />
                </div>
                {error && (
                    <p className="text-neutral-900 bg-red-500 rounded font-bold text-sm w-full grid place-items-center p-2 my-2 text-center">
                        {error}
                    </p>
                )}
            </div>
            <div className="flex justify-around items-center">
                <div className="flex flex-col items-center">
                    <button
                        disabled={loading}
                        className={`w-12 h-12 grid place-items-center rounded text-4xl text-neutral-900 ${
                            loading ? "bg-neutral-400" : "bg-primary-400"
                        }`}
                        onClick={tryTogglePlay}
                    >
                        {hampRunning ? <MdPause /> : <MdPlayArrow />}
                    </button>
                    <span className="text-sm">{hampRunning ? "Stop" : "Start"}</span>
                </div>
                <div className="h-40 flex flex-col justify-center items-center">
                    <p className="text-sm text-neutral-400">Speed {hampVelocity}%</p>
                    <div className="relative grid place-items-center flex-grow">
                        <ProgressRing
                            className="absolute"
                            radius={60}
                            stroke={4}
                            progress={hampRunning ? progress * 100 : 100}
                            color="rgb(244,63,94)"
                        />
                        <p className="text-4xl">
                            {hampRunning
                                ? Math.floor(
                                      (1.0 - progress) * (nextRandomTime - lastRandomTime) + 1
                                  )
                                : "-"}
                        </p>
                    </div>
                    <p className="text-sm text-neutral-400">
                        Stroke {slideMin}% - {slideMax}%
                    </p>
                </div>
                <div className="flex flex-col items-center">
                    <button
                        disabled={loading}
                        className={`w-12 h-12 grid place-items-center rounded text-4xl text-neutral-900 ${
                            loading ? "bg-neutral-400" : "bg-primary-400"
                        }`}
                        onClick={() => setSkip(true)}
                    >
                        <MdSkipNext />
                    </button>
                    <span className="text-sm">Skip</span>
                </div>
            </div>
        </div>
    );
};

export default AppRandom;
