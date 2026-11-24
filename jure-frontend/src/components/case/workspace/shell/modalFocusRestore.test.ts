/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { pickModalFocusRestoreTarget } from './modalFocusRestore';

describe('pickModalFocusRestoreTarget', () => {
  it('prefers connected menu trigger over active menuitem', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    document.body.appendChild(item);
    expect(pickModalFocusRestoreTarget({ preferred: trigger, active: item })).toBe(trigger);
    trigger.remove();
    item.remove();
  });

  it('trigger removed (menu unmount): falls back to header focusable', () => {
    const orphan = document.createElement('button');
    const header = document.createElement('header');
    const cta = document.createElement('button');
    header.appendChild(cta);
    document.body.appendChild(header);
    expect(pickModalFocusRestoreTarget({ preferred: orphan, active: orphan, header })).toBe(cta);
    header.remove();
  });

  it('trigger removed and header has no controls: focuses header itself', () => {
    const orphan = document.createElement('button');
    const header = document.createElement('header');
    document.body.appendChild(header);
    expect(pickModalFocusRestoreTarget({ preferred: orphan, header })).toBe(header);
    header.remove();
  });

  it('returns null when nothing is usable', () => {
    expect(pickModalFocusRestoreTarget({})).toBeNull();
  });
});
