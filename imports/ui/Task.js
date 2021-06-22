import React from 'react';
import { testProp, REMOVE_TODO, CHECKBOX } from '../testIds';

export const Task = ({ task, onCheckboxClick, onDeleteClick }) => {
  return (
    <li>
      <input
        className={CHECKBOX}
        type="checkbox"
        checked={!!task.isChecked}
        onClick={() => onCheckboxClick(task)}
        readOnly
      />
      <span>{task.text}</span>
      <button className={REMOVE_TODO} onClick={() => onDeleteClick(task)}>
        &times;
      </button>
    </li>
  );
};
