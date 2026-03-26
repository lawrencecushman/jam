import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import { useRoom } from "./RoomProvider";
import { TrackId, TRACKS } from "../audio/instruments";
import { STEP_COUNT } from "../config";

type Grid = Record<TrackId, boolean[]>;

function yGridToSnapshot(yGrid: Y.Map<Y.Array<boolean>>): Grid {
  return Object.fromEntries(
    TRACKS.map(({ id }) => {
      const yArr = yGrid.get(id);
      return [id, yArr ? yArr.toArray() : Array(STEP_COUNT).fill(false)];
    }),
  ) as Grid;
}

export function useSharedGrid() {
  const { grid, doc } = useRoom();
  const [snapshot, setSnapshot] = useState<Grid>(() => yGridToSnapshot(grid));

  useEffect(() => {
    // Re-snapshot on any change to the map or nested arrays
    const observer = () => setSnapshot(yGridToSnapshot(grid));
    grid.observeDeep(observer);
    return () => grid.unobserveDeep(observer);
  }, [grid]);

  const toggleStep = useCallback(
    (trackId: TrackId, stepIndex: number) => {
      const yArr = grid.get(trackId);
      if (!yArr) return;
      const current = yArr.get(stepIndex);
      doc.transact(() => {
        yArr.delete(stepIndex, 1);
        yArr.insert(stepIndex, [!current]);
      });
    },
    [grid, doc],
  );

  const paintStep = useCallback(
    (trackId: TrackId, stepIndex: number, value: boolean) => {
      const yArr = grid.get(trackId);
      if (!yArr) return;
      if (yArr.get(stepIndex) === value) return; // already correct, skip CRDT write
      doc.transact(() => {
        yArr.delete(stepIndex, 1);
        yArr.insert(stepIndex, [value]);
      });
    },
    [grid, doc],
  );

  return { grid: snapshot, toggleStep, paintStep };
}
