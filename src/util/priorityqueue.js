const topEl = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

class PriorityQueue {
    constructor(comparator = (a, b) => a > b) {
        this._heap = [];
        this._comparator = comparator;
    }

    size() {
        return this._heap.length();
    }

    isEmpty() {
        return this.size === 0;
    }

    peek() {
        return this._heap[topEl]
    }

    push(...values) {
        values.forEach((value) => {
            this._heap.push(value);
        });

        return this.size();
    }

    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > topEl) {
            this._swap(topEl, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }

    replace(value) {
        const replacedValue = this.peek();
        this._heap[topEl] = value;
        this._siftDown();
        return replacedValue;
    }

    contains(value) {
        return this._heap.includes(value);
    }

    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }

    _siftUp() {
        let node = this.size() - 1;
        while (node > topEl && this._greater(node, parent(node))) {
            this._swap(node, parent(node));
            node = parent(node)
        }
    }

    _siftDown() {
        let node = topEl;
        while (
            (left(node) < this.size() && this._greater(left(node), node)) ||
            (right(node) < this.size() && this._greater(right(node), node))
        ) {
            let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }
}

module.exports = {
    PriorityQueue
}