import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, execute, undo, redo, canUndo, canRedo } from '../core/history.js';

function incrementCommand(amount) {
  return {
    do(state) {
      state.value += amount;
    },
    undo(state) {
      state.value -= amount;
    },
  };
}

test('execute aplica el comando y lo deja en el undo stack', () => {
  const history = createHistory();
  const state = { value: 0 };

  execute(history, state, incrementCommand(5));

  assert.equal(state.value, 5);
  assert.equal(canUndo(history), true);
  assert.equal(canRedo(history), false);
});

test('undo revierte el comando y lo mueve al redo stack', () => {
  const history = createHistory();
  const state = { value: 0 };
  execute(history, state, incrementCommand(5));

  undo(history, state);

  assert.equal(state.value, 0);
  assert.equal(canUndo(history), false);
  assert.equal(canRedo(history), true);
});

test('redo reaplica el comando y vuelve al undo stack', () => {
  const history = createHistory();
  const state = { value: 0 };
  execute(history, state, incrementCommand(5));
  undo(history, state);

  redo(history, state);

  assert.equal(state.value, 5);
  assert.equal(canUndo(history), true);
  assert.equal(canRedo(history), false);
});

test('ejecutar un comando nuevo tras un undo descarta la rama de redo', () => {
  const history = createHistory();
  const state = { value: 0 };
  execute(history, state, incrementCommand(5));
  undo(history, state);

  execute(history, state, incrementCommand(2));

  assert.equal(state.value, 2);
  assert.equal(canRedo(history), false);
});

test('undo y redo sobre historial vacío no lanzan error', () => {
  const history = createHistory();
  const state = { value: 0 };

  assert.doesNotThrow(() => undo(history, state));
  assert.doesNotThrow(() => redo(history, state));
  assert.equal(state.value, 0);
});

test('canUndo y canRedo reflejan el estado de las pilas', () => {
  const history = createHistory();
  const state = { value: 0 };

  assert.equal(canUndo(history), false);
  assert.equal(canRedo(history), false);

  execute(history, state, incrementCommand(1));
  assert.equal(canUndo(history), true);

  undo(history, state);
  assert.equal(canUndo(history), false);
  assert.equal(canRedo(history), true);
});
