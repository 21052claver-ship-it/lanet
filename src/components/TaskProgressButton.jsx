import React from 'react';
import { useApp } from '../context';
import { Button } from '../ui';
import { eventKind } from '../../shared/agenda';

export default function TaskProgressButton({ event }) {
  const { taskWrites } = useApp();
  if (eventKind(event) !== 'task') return null;
  const done = taskWrites.isDone(event);
  return (
    <Button
      busy={taskWrites.isPending(event)}
      aria-busy={taskWrites.isPending(event)}
      onClick={() => taskWrites.setDone(event, !done)}
    >
      {done ? 'Tornar a marcar pendent' : 'Marcar com a feta'}
    </Button>
  );
}
