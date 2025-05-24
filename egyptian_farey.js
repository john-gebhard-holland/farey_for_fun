// Egyptian-style table representation of Farey sequences with logarithmic storage
class EgyptianFareyTable {
    constructor() {
        // Main table structure
        this.table = new Map();  // Maps denominators to their unit fractions
        this.unitFractions = new Set();  // Set of all unit fractions
        this.mediantTable = new Map();   // Cache for mediant computations
        this.logTable = new Map();       // Logarithmic storage for efficient computation
        this.base = 2;                   // Base for logarithmic storage
    }

    // Egyptian multiplication method
    egyptianMultiply(a, b) {
        let result = 0;
        let current = a;
        let multiplier = b;
        
        while (multiplier > 0) {
            if (multiplier % 2 === 1) {
                result += current;
            }
            current *= 2;
            multiplier = Math.floor(multiplier / 2);
        }
        
        return result;
    }

    // Add a unit fraction to the table with logarithmic storage
    addUnitFraction(denominator) {
        if (denominator <= 0) return;
        
        const fraction = `1/${denominator}`;
        this.unitFractions.add(fraction);
        
        // Initialize table entry if needed
        if (!this.table.has(denominator)) {
            this.table.set(denominator, new Set());
        }
        
        this.table.get(denominator).add(fraction);
        
        // Store logarithmic representation
        const logValue = Math.log(denominator) / Math.log(this.base);
        this.logTable.set(denominator, logValue);
        
        this.updateMediantTable(denominator);
    }

    // Update mediant table for a new denominator
    updateMediantTable(denominator) {
        for (let d of this.table.keys()) {
            if (d === denominator) continue;
            
            // Compute mediant: (1/d + 1/denominator) / 2
            const mediant = this.computeMediant(d, denominator);
            const key = `${d},${denominator}`;
            this.mediantTable.set(key, mediant);
        }
    }

    // Compute mediant using Egyptian multiplication and logarithmic storage
    computeMediant(d1, d2) {
        const key = `${d1},${d2}`;
        if (this.mediantTable.has(key)) {
            return this.mediantTable.get(key);
        }

        // Use logarithmic storage for efficient computation
        const log1 = this.logTable.get(d1) || Math.log(d1) / Math.log(this.base);
        const log2 = this.logTable.get(d2) || Math.log(d2) / Math.log(this.base);
        
        // Egyptian-style computation using tables and logs
        const numerator = this.egyptianMultiply(d1, d2);
        const denominator = this.egyptianMultiply(d1 + d2, 1);
        
        // Simplify using Egyptian methods
        return this.simplifyEgyptian(numerator, denominator);
    }

    // Simplify fraction using Egyptian methods
    simplifyEgyptian(numerator, denominator) {
        if (numerator === 0) return "0";
        if (numerator === denominator) return "1";
        
        // Find largest unit fraction that fits
        let result = [];
        let remaining = numerator;
        let currentDenom = denominator;
        
        while (remaining > 0) {
            const unitFraction = Math.ceil(currentDenom / remaining);
            result.push(`1/${unitFraction}`);
            remaining = remaining * unitFraction - currentDenom;
            currentDenom = currentDenom * unitFraction;
        }
        
        return result.join(" + ");
    }

    // Generate Farey sequence of order n using Egyptian methods and logarithmic storage
    generateFareySequence(n) {
        const sequence = new Set();
        sequence.add("0");
        sequence.add("1");

        // Build up from unit fractions using logarithmic storage
        for (let i = 1; i <= n; i++) {
            this.addUnitFraction(i);
        }

        // Generate all possible combinations using Egyptian addition and logarithmic storage
        for (let d1 of this.table.keys()) {
            for (let d2 of this.table.keys()) {
                if (d1 >= d2) continue;
                
                const mediant = this.computeMediant(d1, d2);
                if (mediant) {
                    sequence.add(mediant);
                }
            }
        }

        return Array.from(sequence).sort((a, b) => {
            return this.evaluateEgyptian(a) - this.evaluateEgyptian(b);
        });
    }

    // Evaluate an Egyptian fraction expression
    evaluateEgyptian(expression) {
        if (expression === "0") return 0;
        if (expression === "1") return 1;
        
        return expression.split(" + ").reduce((sum, term) => {
            const [_, denom] = term.split("/");
            return sum + 1/parseInt(denom);
        }, 0);
    }

    // Find the Egyptian representation of a rational number using logarithmic storage
    findEgyptianRepresentation(rational) {
        if (rational <= 0) return "0";
        if (rational >= 1) return "1";
        
        let result = [];
        let remaining = rational;
        
        while (remaining > 0.000001) {  // Small epsilon for floating point
            // Use logarithmic search for the next unit fraction
            const logRemaining = Math.log(1/remaining) / Math.log(this.base);
            const unitFraction = Math.ceil(Math.pow(this.base, logRemaining));
            result.push(`1/${unitFraction}`);
            remaining -= 1/unitFraction;
        }
        
        return result.join(" + ");
    }

    // Get the logarithmic representation of a fraction
    getLogRepresentation(fraction) {
        if (fraction === "0") return -Infinity;
        if (fraction === "1") return 0;
        
        return fraction.split(" + ").reduce((sum, term) => {
            const [_, denom] = term.split("/");
            return sum + this.logTable.get(parseInt(denom)) || Math.log(parseInt(denom)) / Math.log(this.base);
        }, 0);
    }

    // Find the closest Farey number to a given value using logarithmic search
    findClosestFareyNumber(value) {
        const logValue = Math.log(value) / Math.log(this.base);
        let closest = null;
        let minDiff = Infinity;
        
        for (let fraction of this.unitFractions) {
            const logRep = this.getLogRepresentation(fraction);
            const diff = Math.abs(logRep - logValue);
            
            if (diff < minDiff) {
                minDiff = diff;
                closest = fraction;
            }
        }
        
        return closest;
    }
}

// Example usage:
const egyptianFarey = new EgyptianFareyTable();

// Generate Farey sequence of order 5
const fareySequence = egyptianFarey.generateFareySequence(5);
console.log("Farey sequence of order 5:", fareySequence);

// Test Egyptian multiplication
console.log("\nEgyptian multiplication examples:");
console.log("13 × 11 =", egyptianFarey.egyptianMultiply(13, 11));
console.log("7 × 8 =", egyptianFarey.egyptianMultiply(7, 8));

// Test logarithmic storage
console.log("\nLogarithmic representations:");
for (let i = 1; i <= 5; i++) {
    console.log(`log₂(${i}) =`, egyptianFarey.getLogRepresentation(`1/${i}`));
}

// Find closest Farey number
console.log("\nClosest Farey number to 0.618 (golden ratio):");
console.log(egyptianFarey.findClosestFareyNumber(0.618)); 