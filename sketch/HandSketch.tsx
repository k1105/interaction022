import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isFront } from "../lib/detector/isFront";
import { Monitor } from "../components/Monitor";
// import { Recorder } from "../components/Recorder";
import { Handpose } from "../@types/global";
import { DisplayHands } from "../lib/DisplayHandsClass";
import { HandposeHistory } from "../lib/HandposeHitsoryClass";
import * as Tone from "tone";

type Props = {
  handpose: MutableRefObject<Hand[]>;
};
const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const HandSketch = ({ handpose }: Props) => {
  const handposeHistory = new HandposeHistory();
  const displayHands = new DisplayHands();
  const r = 120;
  const offset = 30;
  const multi = 1.3;
  const stackRef = useRef<number>(0);

  const distList: number[] = new Array(10).fill(50);
  const flickerArray: boolean[] = new Array(10).fill(false);
  // const toneArray = [
  //   "C4",
  //   "D4",
  //   "E4",
  //   "F4",
  //   "G4",
  //   "A4",
  //   "B4",
  //   "C5",
  //   "D5",
  //   "E5",
  // ];

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const synth = new Tone.Synth().toDestination();

  const player = new Tone.Player(
    "https://k1105.github.io/sound_effect/audio/wood_attack.m4a"
  ).toDestination();

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current);
    handposeHistory.update(rawHands);
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    // logとしてmonitorに表示する
    debugLog.current = [];
    for (const hand of handpose.current) {
      debugLog.current.push({
        label: hand.handedness + " accuracy",
        value: hand.score,
      });
    }

    p5.clear();
    displayHands.update(hands);

    let start;
    let end;

    if (displayHands.left.pose.length > 0) {
      const hand = displayHands.left.pose;
      for (let n = 0; n < 5; n++) {
        if (n === 0) {
          start = 2;
        } else {
          start = 4 * n + 1;
        }
        end = 4 * n + 4;
        distList[2 * n] = Math.min(
          Math.max((hand[start].y - hand[end].y) * multi, 0),
          r
        );
      }
    }

    if (displayHands.right.pose.length > 0) {
      const hand = displayHands.right.pose;
      for (let n = 0; n < 5; n++) {
        if (n === 0) {
          start = 2;
        } else {
          start = 4 * n + 1;
        }
        end = 4 * n + 4;
        distList[2 * n + 1] = Math.min(
          Math.max((hand[start].y - hand[end].y) * multi, 0),
          r
        );
      }
    }

    p5.translate(0, p5.height / 2);
    for (let n = 0; n < 5; n++) {
      p5.translate(p5.width / 6, 0);
      const dLeft = distList[2 * n];
      const dRight = distList[2 * n + 1];
      if (dLeft < 10) {
        if (!flickerArray[2 * n]) {
          stackRef.current++;
          flickerArray[2 * n] = true;
        }
      } else {
        flickerArray[2 * n] = false;
      }
      if (dRight < 10) {
        if (!flickerArray[2 * n + 1]) {
          stackRef.current++;
          flickerArray[2 * n + 1] = true;
        }
      } else {
        flickerArray[2 * n + 1] = false;
      }
      p5.line(
        -offset,
        0,
        -offset - p5.sqrt((r / 2) ** 2 - (dLeft / 2) ** 2),
        -dLeft / 2
      );
      p5.line(
        -offset - p5.sqrt((r / 2) ** 2 - (dLeft / 2) ** 2),
        -dLeft / 2,
        -offset,
        -dLeft
      );

      p5.line(
        offset,
        0,
        offset + p5.sqrt((r / 2) ** 2 - (dRight / 2) ** 2),
        -dRight / 2
      );
      p5.line(
        offset + p5.sqrt((r / 2) ** 2 - (dRight / 2) ** 2),
        -dRight / 2,
        offset,
        -dRight
      );
    }

    if (stackRef.current > 0) {
      // Tone.loaded().then(() => {
      player.start();
      // });
    }
    stackRef.current = Math.max(0, stackRef.current - 1);
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Monitor handpose={handpose} debugLog={debugLog} />
      {/* <Recorder handpose={handpose} /> */}
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};
