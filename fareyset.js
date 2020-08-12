function FareyNode(value, leftNum = 0, leftDen = 1, rightNum = 1, rightDen = 1) {
    return {
        value,
        leftNum,
        leftDen,
        rightDen,
        rightNum,
        leftDecimal() {
            return this.leftNum / this.leftDen
        },
        rightDecimal() {
            return this.rightNum / this.rightDen
        },
        equals(other) {
            return this.leftNum == other.leftNum &&
                   this.leftDen == other.leftDen &&
                   this.rightNum == other.rightNum &&
                   this.rightDen == other.rightDen &&
                   this.value == other.value
        },
        posGreaterThan(other) {
            return this.leftDecimal() > other.leftDecimal()
        },
        posLessThan(other) {
            return this.leftDecimal() < other.leftDecimal()
        },
        isAncestor(other) {
            return this.leftDecimal() < other.leftDecimal() && this.rightDecimal() > other.rightDecimal()
        }
    }
}

function FareyNestedIntervalSet() {
    let set = []

    return {
        insert(value, left = undefined, right = undefined) {
            if (!set.length) {
                set.push(FareyNode(value, 0, 1, 1, 1))
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
                return this.addChild(value, left, withRespectTo = right)
            } else if (right.isAncestor(left)) {
                return this.addChild(value, right, withRespectTo = left)
            }

            // neither is ancestor of eachother
            let median = (left.rightNum + right.leftNum) / (left.rightDen + right.leftDen)

            let searchAsc = (median - left.rightDecimal()) < (right.leftDecimal() - median) ? true : false;

            let prev;
            if (searchAsc) {
                let searchNode = left;
                prev = searchNode;
                let i = set.indexOf(searchNode)
                while ((median - searchNode.rightDecimal()) > 0) {
                    if (i + 1 >= set.length) break;

                    i++;
                    prev = searchNode
                    searchNode = set[i + 1]
                }
            } else {
                let searchNode = left;
                prev = searchNode;
                let i = set.indexOf(searchNode)
                while ((searchNode.leftDecimal() - median) > 0) {
                    if (i - 1 < 0) break;
                    
                    i--;
                    prev = searchNode
                    searchNode = set[i - 1]
                }
            }

            let medianNode = prev

            if (searchAsc) {
                let leftOfMedian = this.findNeighbors(medianNode)[0]

                let leftNum = leftOfMedian.rightNum + medianNode.leftNum
                let leftDen = leftOfMedian.rightDen + medianNode.leftDen

                let rightNum = leftNum + medianNode.leftNum
                let rightDen = leftDen + medianNode.leftDen

                let newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                set.splice(set.indexOf(leftOfMedian), 0, newNode)
            } else {
                let rightOfMedian = this.findNeighbors(medianNode)[1]
                
                let leftNum = medianNode.rightNum + rightOfMedian.leftNum
                let leftDen = medianNode.rightDen + rightOfMedian.leftDen

                let rightNum = leftNum + medianNode.leftNum
                let rightDen = leftDen + medianNode.leftDen

                let newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

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
            let left, right = this.findNeighbors(node)

            // if left is an ancestor of right, then search left until we find what the ancestor of left is
            let parent = this.getParent(node);

            if (parent) {
                let rightNum = right.leftNum + (left ? left.leftNum : parent.leftNum)
                let rightDen = right.leftDen + (left ? left.leftDen : parent.leftDen)

                let leftNum = right.leftNum + rightNum
                let leftDen = right.leftDen + rightDen

                let newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                set.splice(set.indexOf((left ? left : parent)), 0, newNode)

                return newNode
            } else if (right) {
                let rightNum = node.rightNum + right.leftNum
                let rightDen = node.rightDen + right.leftDen

                let leftNum = node.rightNum + rightNum
                let leftDen = node.rightNum + rightDen

                let newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                set.splice(set.indexOf(node), 0, newNode)

                return newNode
            } else {
                // we don't have a right node, so we need to modify the selected node's right value
                //  as it is no longer the last node in the set
                let rightNum = 1
                let rightDen = 1

                // the selected node's right value becomes its left / right median
                // the appending node's left value becomes median of that + 1/1
                let newRightNum = node.leftNum + node.rightNum
                let newRightDen = node.leftDen + node.rightDen

                let leftNum = newRightNum + 1
                let leftDen = newRightDen + 1

                let newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                node.rightNum = newRightNum
                node.rightDen = newRightDen

                return newNode
            }
        },
        //prepends as sibling to the selected node
        prepend(value, node) {
            let left, _ = this.findNeighbors(node)
            let leftNum, leftDen, rightNum, rightDen, newNode, newLeftNum, newLeftDen;

            // if left is an ancestor of right, then search left until we find what the ancestor of left is
            let parent = this.getParent(node);

            if (parent) {
                let parentLeft = parent.leftDecimal();

                return this.addChild(value, parent, this.findNeighbors(node)[0])
            } else if (left) {
                leftNum = node.leftNum + left.rightNum
                leftDen = node.rightDen + left.rightDen

                rightNum = node.leftNum + leftNum
                rightDen = node.leftDen + leftDen

                newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                set.splice(set.indexOf(node), 0, newNode)

                return newNode
            } else {
                // we don't have a left node, so we need to modify the selected node's left value
                //  as it is no longer the last node in the set
                leftNum = 0
                leftDen = 1

                // the selected node's left value becomes its left / right median
                // the appending node's left value becomes median of that + 0/1
                newLeftNum = node.leftNum + node.rightNum
                newLeftDen = node.leftDen + node.rightDen

                leftNum = newRightNum + 0
                leftDen = newRightDen + 1

                newNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                node.leftNum = newLeftNum
                node.leftDen = newLeftDen

                return newNode
            }
        },
        addChild(value, node) {
            let descendents = this.getDescendents(node).reverse()
            let lastDirectChild = descendents.find(d => this.getParent(d) == node)
            
            if (!lastDirectChild) {
                // we don't have any descendents then!
                let rightNum = node.leftNum + node.rightNum
                let rightDen = node.leftDen + node.rightDen

                let leftNum = node.leftNum + rightNum
                let leftDen = node.leftDen + rightDen

                let childNode = FareyNode(value, leftNum, leftDen, rightNum, rightDen)

                set.splice(set.indexOf(node), 0, childNode)

                return childNode
            } else {
                this.append(value, lastDirectChild)
            }

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
            return (left.rightNum + right.leftNum) / (left.rightDen + right.leftDen)
        },
        findNeighbors(node) {
            if (set.length == 0) {
                return [];
            }

            if (set.length == 1) {
                return node.posGreaterThan(set[0]) ? [set[0], undefined] : [undefined, set[0]];
            }

            let left = undefined, right = undefined;

            for (let i = 0; i < set.length; i++) {
                let n = set[i]

                if (n.rightDecimal() < node.leftDecimal()) {
                    if (!left || left.posLessThan(n)) {
                        left = n;
                    }
                } else if (n.leftDecimal() > node.rightDecimal()) {
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