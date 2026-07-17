const DOM_GUARD_FLAG = '__neovaleDomMutationGuardInstalled__';

type GuardedWindow = Window & typeof globalThis & { [DOM_GUARD_FLAG]?: boolean };

function isDifferentParentError(parent: Node, child: Node | null): boolean {
  return Boolean(child && child.parentNode && child.parentNode !== parent);
}

function markDocumentAsNonTranslatable() {
  document.documentElement.lang = 'pt-BR';
  document.documentElement.translate = false;
  document.documentElement.setAttribute('translate', 'no');
  document.documentElement.classList.add('notranslate');

  if (document.body) {
    document.body.translate = false;
    document.body.setAttribute('translate', 'no');
    document.body.classList.add('notranslate');
  }

  const root = document.getElementById('root');
  if (root) {
    root.setAttribute('translate', 'no');
    root.classList.add('notranslate');
  }
}

export function installDomMutationGuard() {
  if (typeof window === 'undefined' || typeof Node === 'undefined') return;

  const guardedWindow = window as GuardedWindow;
  if (guardedWindow[DOM_GUARD_FLAG]) return;
  guardedWindow[DOM_GUARD_FLAG] = true;

  markDocumentAsNonTranslatable();

  const originalRemoveChild = Node.prototype.removeChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  const originalReplaceChild = Node.prototype.replaceChild;

  Node.prototype.removeChild = function removeChildGuard<T extends Node>(this: Node, child: T): T {
    if (isDifferentParentError(this, child)) {
      child.parentNode?.removeChild(child);
      return child;
    }
    if (!child?.parentNode) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  Node.prototype.insertBefore = function insertBeforeGuard<T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  Node.prototype.replaceChild = function replaceChildGuard<T extends Node>(this: Node, newChild: Node, oldChild: T): T {
    if (oldChild && oldChild.parentNode !== this) {
      this.appendChild(newChild);
      return oldChild;
    }
    return originalReplaceChild.call(this, newChild, oldChild) as T;
  };
}

installDomMutationGuard();