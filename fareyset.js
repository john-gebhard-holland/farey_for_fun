function additionDoesOverflow(a, b) {
    // from https://www.algotech.solutions/blog/javascript/handle-number-overflow-javascript/
    let c = a + b

    return (a !== c - b) || (b !== c - a)
}

function multiplicationDoesOverflow(a, b) {
    // from https://www.algotech.solutions/blog/javascript/handle-number-overflow-javascript/
    let c = a * b

    return (a !== c / b) || (b !== c / a)
}

function Fraction(numerator, denominator) {
    return {
        numerator: numerator,
        denominator: denominator,
        copy() {
            return Fraction(this.numerator, this.denominator)
        },
        decimal() {
            return this.numerator / this.denominator
        },
        equals(other) {
            return this.numerator == other.numerator && this.denominator == other.denominator
        },
        crossMultiply(against) {
            return Fraction(this.numerator * against.denominator, this.denominator * against.denominator)
        },
        fractionAdditionOverflows(against) {
            if (multiplicationDoesOverflow(this.denominator, against.denominator) || 
                multiplicationDoesOverflow(this.numerator, against.denominator) || 
                multiplicationDoesOverflow(against.numerator, this.denominator) ||
                additionDoesOverflow(this.numerator * against.denominator, against.numerator * this.denominator)) {
                return false;
            }

            return true;
        },
        medianTo(other) {
            return Fraction(this.numerator + other.numerator, this.denominator + other.denominator)
        },
        gt(other) { // greater than
            let overflows = this.fractionAdditionOverflows(other)

            if (overflows) {
                if (isNaN(this.decimal()) || isNaN(other.decimal())) {
                    throw new Error("bounds of set have been met")
                }
                return this.decimal() > other.decimal()
            } else {
                let cross = this.crossMultiply(other)
                let otherCross = other.crossMultiply(this)

                if (isNaN(cross.numerator) || isNaN(cross.denominator) || isNaN(otherCross.numerator) || isNaN(otherCross.denominator)) {
                    throw new Error("overflow function broken")
                }

                return cross[0] > otherCross[0]
            }
        },
        lt(other) { // less than
            let overflows = this.fractionAdditionOverflows(other)

            if (overflows) {
                if (isNaN(this.decimal()) || isNaN(other.decimal())) {
                    throw new Error("bounds of set have been met")
                }

                return this.decimal() < other.decimal()
            } else {
                let cross = this.crossMultiply(other)
                let otherCross = other.crossMultiply(this)

                if (isNaN(cross.numerator) || isNaN(cross.denominator) || isNaN(otherCross.numerator) || isNaN(otherCross.denominator)) {
                    throw new Error("overflow function broken")
                }

                return cross[0] < otherCross[0]
            }
        }
    }
}

function FareyNode(value, left = Fraction(0, 1), right = Fraction(1, 1)) {
    return {
        value,
        left, 
        right,
        equals(other) {
            return this.left.equals(other.left) &&
                   this.right.equals(other.right) &&
                   this.value == other.value
        },
        posGreaterThan(other) {
            return this.left.gt(other.left)
        },
        posLessThan(other) {
            return this.left.lt(other.left)
        },
        isAncestor(other) {
            return this.left.lt(other.left) && this.right.gt(other.right)
        }
    }
}

function FareyNestedIntervalSet() {
    let set = []

    return {
        insert(value, left = undefined, right = undefined) {
            if (!set.length) {
                set.push(FareyNode(value, Fraction(0, 1), Fraction(1, 1)))
                return set[0]
            } else if (!left && !right) {
                throw new Error("set is not empty, cannot insert a node without left or right nodes")
            }

            if (!left && right) {
                return this.prepend(value, right)
            } else if (left && !right) {
                return this.append(value, left)
            }

            if (left.posGreaterThan(right)) {
                //switch them as that is invalid input, but warn
                console.error("WARNING: left and right wrong order -- switched")
                let temp = right
                left = right
                right = temp
            }

            //first get the median of left and right,
            // then insert append or prepend to whatever is closest to that
            if (left.isAncestor(right)) {
                return this.addChild(value, left)
            } else if (right.isAncestor(left)) {
                return this.addChild(value, right)
            }

            // neither is ancestor of eachother
            let median = left.right.medianTo(right.left)

            let searchAsc = (median.decimal() - left.right.decimal()) < (right.left.decimal() - median.decimal()) ? true : false;

            let prev;
            if (searchAsc) {
                let searchNode = left;
                prev = searchNode;
                let i = set.indexOf(searchNode)
                while ((median - searchNode.right.decimal()) > 0) {
                    if (i + 1 >= set.length) break;

                    i++;
                    prev = searchNode
                    searchNode = set[i + 1]
                }
            } else {
                let searchNode = left;
                prev = searchNode;
                let i = set.indexOf(searchNode)
                while ((searchNode.left.decimal() - median) > 0) {
                    if (i - 1 < 0) break;
                    
                    i--;
                    prev = searchNode
                    searchNode = set[i - 1]
                }
            }

            let medianNode = prev

            if (searchAsc) {
                let leftOfMedian = this.findNeighbors(medianNode)[0]

                let leftFraction = leftOfMedian.right.medianTo(medianNode.left)

                let rightFraction = leftFraction.medianTo(medianNode.left)

                let newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(leftOfMedian), 0, newNode)
            } else {
                let rightOfMedian = this.findNeighbors(medianNode)[1]
                
                let leftFraction = medianNode.right.medianTo(rightOfMedian.left)

                let rightFraction = leftFraction.medianTo(medianNode.left)

                let newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(rightOfMedian), 0, newNode)
            }
            
        },
        delete(node) {
            // no additional mutation necessary, however rebalancing may be desireable eventually
            for (let i = 0; i < set.length; i++) {
                if (set[i].equals(node)) {
                    set.splice(i, 1)
                }
            }
        },
        //appends as sibling to the selected node
        append(value, node) {
            let [left, right] = this.findNeighbors(node)

            // if left is an ancestor of right, then search left until we find what the ancestor of left is
            let parent = this.getParent(node);

            if (parent) {
                // if we have a parent:
                //   use right.left if parent.isAncestor(right), else use parent.right
                let rightFraction = right.left.mediantTo(left ? left.left : parent.left)

                //   use left.right if parent.isAncestor(left), else use parent.left
                let leftFraction = right.left.mediantTo(rightFraction)

                let newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf((left ? left : parent)), 0, newNode)

                return newNode
            } else if (right) {
                let rightFraction = node.right.medianTo(right.left)

                let leftFraction = node.right.medianTo(rightFraction)

                let newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(node), 0, newNode)

                return newNode
            } else {
                 // we don't have a left node, so we need to modify the selected node's left value
                //  as it is no longer the last node in the set
                rightFraction = Fraction(1, 1)

                // the selected node's right value becomes its left / right median
                // the appending node's left value becomes median of that + 0/1
                // TODO: NOTE: this may have a bug if the selected node has children
                //   to fix this the new rightFraction becomes the node.right.medianTo(last_child.right)
                let lastChild;
                let hasChildren = this.hasChildren(node)
                if (hasChildren) {
                    lastChild = this.getLastDescendent(node)
                    newRightFraction = node.right.mediantTo(lastChild.right)
                    node.right = newRightFraction.copy()
                    leftFraction = newRightFraction.copy()
                    leftFraction.numerator += 1
                    leftFractionn.denominator += 1
                } else {
                    newRightFraction = node.right.medianTo(node.left)
                    node.right = newRightFraction.copy()
                    leftFraction = newRightFraction.copy()
                    leftFraction.numerator += 1
                    leftFraction.denominator += 1    
                }

                newNode = FareyNode(value, leftFraction, rightFraction)
                set.splice(hasChildren ? set.indexOf(lastCHild) : set.indexOf(node), 0, newNode)

                return newNode
            }
        },
        //prepends as sibling to the selected node
        prepend(value, node) {
            let left, _ = this.findNeighbors(node)
            let leftFraction, rightFraction, newNode, newLeftFraction;

            // if left is an ancestor of right, then search left until we find what the ancestor of left is
            let parent = this.getParent(node);

            if (parent) {
                // if we have a parent:
                //   use left.right if parent.isAncestor(right), else use parent.right
                leftFraction = left.right.mediantTo(left && !parent.isAncestor(left) ? left.left : parent.left)

                //   use left.right if parent.isAncestor(left), else use parent.left
                rightFraction = left.right.mediantTo(leftFraction)

                newNode = FareyNode(value, leftFraction, rightFraction)
                
                set.splice((left && parent.isAncestor(left)) ? set.indexOf(left) : set.indexOf(parent) - 1, 0, newNode)

                return newNode
            } else if (left) {
                leftFraction = node.left.medianTo(left.right)

                rightFraction = node.left.medianTo(leftFraction)

                newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(node) - 1, 0, newNode)

                return newNode
            } else {
                // we don't have a left node, so we need to modify the selected node's left value
                //  as it is no longer the last node in the set
                leftFraction = Fraction(0, 1)

                // the selected node's left value becomes its left / right median
                // the appending node's left value becomes median of that + 0/1
                // TODO: NOTE: this may have a bug if the selected node has children
                //   to fix this the new leftFraction becomes the node.left.medianTo(first_child.left)
                if (this.hasChildren(node)) {
                    let firstChild = this.getFirstDescendent(node)
                    newLeftFraction = node.left.mediantTo(firstChild.left)
                    node.left = newLeftFraction.copy()
                    rightFraction = newLeftFraction.copy()
                    rightFraction.denominator += 1
                } else {
                    newLeftFraction = node.left.medianTo(node.right)    
                    node.left = newLeftFraction.copy()
                    rightFraction = newLeftFraction.copy()
                    rightFraction.denominator += 1    
                }

                newNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(node) - 1, 0, newNode)

                return newNode
            }
        },
        hasChildren(node) {
            let index = set.indexOf(node)

            if (index < 0) return;
        
            if (index + 1  > set.length - 1) {
                return false;
            }

            return node.isAncestor(set[i+1])
        },
        addChild(value, node) {
            let descendents = this.getDescendents(node).reverse()
            let lastDirectChild = descendents.find(d => this.getParent(d) == node)
            
            if (!lastDirectChild) {
                // we don't have any descendents then!
                let rightFraction = node.left.medianTo(node.right)

                let leftFraction = node.left.medianTo(rightFraction)

                let childNode = FareyNode(value, leftFraction, rightFraction)

                set.splice(set.indexOf(node), 0, childNode)

                return childNode
            } else {
                this.append(value, lastDirectChild)
            }

        },
        getFirstDescendent(node) {
            let start = set.indexOf(node)
            return start+1 > set.length-1 || !node.isAncestor(set[start+1]) ? undefined : set[start+1]
        },
        getLastDescendent(node) {
            let descendents = this.getDescendents(node)
            return descendents.length ? descendents[descendents.length - 1] : undefined
        },
        getDescendents(node) {
            let start = set.indexOf(node)
            let descendents = []
            for (let i = start + 1; i < set.length; i++) {
                if (node.isAncestor(set[i])) {
                    descendents.push(set[i])
                } else {
                    break;
                }
            }

            return descendents;
        },
        getParent(node) {
            for (let i = set.indexOf(node) - 1; i >= 0; i--) {
                if (set[i].isAncestor(node)) {
                    return set[i]
                }
            }

            return undefined;
        },
        getParents(node) {
            let parents = []
            let parent = this.getParent(node)
            while (parent) {
                parents.push(parent)
                parent = this.getParent(node);
            }
        },
        getSet() {
            return set.slice()
        },
        getMedian(left, right) {
            return left.right.medianTo(right.left)
        },
        findNeighbors(node) {
            if (set.length == 0) {
                return [];
            }

            if (set.length == 1) {
                if (set[0] == node) {
                    return [];
                } else {
                    return node.posGreaterThan(set[0]) ? [set[0], undefined] : [undefined, set[0]];
                }
            }

            let left = undefined, right = undefined;

            for (let i = 0; i < set.length; i++) {
                let n = set[i]

                if (n == node) {
                    // if we're already in the set, we do not want to report as our own neighbor
                    continue;
                }

                if (n.right.decimal() < node.left.decimal()) {
                    if (!left || left.posLessThan(n)) {
                        left = n;
                    }
                } else if (n.left.decimal() > node.right.decimal()) {
                    if (!right || right.posGreaterThan(n)) {
                        right = n
                    }
                }
            }

            return [left, right]
        }
    }
}

let set = FareyNestedIntervalSet()

let root = set.insert(1)
let rootSibling = set.append(2, root)

let rootChild = set.addChild(3, root)
let rootChildSibling = set.append(4, rootChild)

console.log(set.getSet())

// huh? why?
console.log(root.isAncestor(rootChild))
console.log(root.isAncestor(rootChildSibling))