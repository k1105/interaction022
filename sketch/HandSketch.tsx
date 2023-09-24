import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject, useRef } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { dotHand } from "../lib/p5/dotHand";
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
  const r = 50;
  const offset = 30;
  const flickerArray: boolean[] = new Array(10).fill(false);
  const toneArray = [
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
  ];

  const debugLog = useRef<{ label: string; value: any }[]>([]);

  const synth = new Tone.Synth().toDestination();

  // const player = new Tone.Player(
  //   "https://k1105.github.io/sound_effect/audio/wood_attack.m4a"
  // ).toDestination();

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
      debugLog.current.push({
        label: hand.handedness + " is front",
        //@ts-ignore
        value: isFront(hand.keypoints, hand.handedness.toLowerCase()),
      });
    }

    p5.clear();
    displayHands.update(hands);

    if (displayHands.left.pose.length > 0) {
      const hand = displayHands.left.pose;
      p5.push();
      p5.fill(255, displayHands.left.opacity);
      p5.translate(0, window.innerHeight / 2);

      let start;
      let end;

      for (let n = 0; n < 5; n++) {
        if (n === 0) {
          start = 2;
        } else {
          start = 4 * n + 1;
        }
        end = 4 * n + 4;
        p5.translate(window.innerWidth / 6, 0);

        const d = (hand[end].y - hand[start].y) / 1.5;
        if (d > 0) {
          p5.line(-offset, 0, -(3 * r) / 2, 0);
          if (!flickerArray[2 * n]) {
            synth.triggerAttackRelease(toneArray[n + 5], "8n");

            flickerArray[2 * n] = true;
          }
        } else {
          flickerArray[2 * n] = false;
          if (r < p5.abs(d)) {
            p5.line(-offset, 0, -offset, -3 * r);
          } else {
            p5.line(
              -offset,
              0,
              -offset - p5.sqrt(r ** 2 - d ** 2),
              (3 * d) / 2
            );
            p5.line(
              -offset - p5.sqrt(r ** 2 - d ** 2),
              (3 * d) / 2,
              -offset,
              3 * d
            );
          }
        }
      }
      p5.pop();
    }

    if (displayHands.right.pose.length > 0) {
      const hand = displayHands.right.pose;
      p5.push();
      p5.stroke(255, displayHands.left.opacity);
      p5.translate(0, window.innerHeight / 2);

      let start;
      let end;

      for (let n = 0; n < 5; n++) {
        if (n === 0) {
          start = 2;
        } else {
          start = 4 * n + 1;
        }
        end = 4 * n + 4;
        p5.translate(window.innerWidth / 6, 0);

        const d = (hand[end].y - hand[start].y) / 1.5;
        if (d > 0) {
          p5.line(offset, 0, (3 * r) / 2, 0);
          if (!flickerArray[2 * n + 1]) {
            synth.triggerAttackRelease(toneArray[n], "8n");
            flickerArray[2 * n + 1] = true;
          }
        } else {
          flickerArray[2 * n + 1] = false;
          if (r < p5.abs(d)) {
            p5.line(offset, 0, offset, -3 * r);
          } else {
            p5.line(offset, 0, offset + p5.sqrt(r ** 2 - d ** 2), (3 * d) / 2);
            p5.line(
              offset + p5.sqrt(r ** 2 - d ** 2),
              (3 * d) / 2,
              offset,
              3 * d
            );
          }
        }
      }
      p5.pop();
    }
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
