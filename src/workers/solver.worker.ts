import { Section, SolveRequest, SolveResponse } from '../types';
import { solveSchedules } from '../solver';

export type WorkerIncomingMessage =
  | {
      type: 'solve';
      request: SolveRequest;
      sections: Section[];
    }
  | {
      type: 'cancel';
    };

export type WorkerOutgoingMessage =
  | {
      type: 'progress';
      checkedCount: number;
      validCount: number;
    }
  | {
      type: 'done';
      response: SolveResponse;
    }
  | {
      type: 'error';
      message: string;
    };

// Handle incoming messages in the Worker
self.onmessage = (event: MessageEvent<WorkerIncomingMessage>) => {
  const data = event.data;

  if (data.type === 'solve') {
    try {
      const response = solveSchedules(
        data.sections,
        data.request,
        (checkedCount, validCount) => {
          self.postMessage({
            type: 'progress',
            checkedCount,
            validCount,
          } as WorkerOutgoingMessage);
        }
      );

      self.postMessage({
        type: 'done',
        response,
      } as WorkerOutgoingMessage);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown solver worker error';
      self.postMessage({
        type: 'error',
        message: errorMessage,
      } as WorkerOutgoingMessage);
    }
  }
};
