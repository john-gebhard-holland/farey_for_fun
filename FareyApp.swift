import SwiftUI

@main
struct FareyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var primeFactor: Float = 2.0
    @State private var wobbleIntensity: Float = 0.5
    @State private var rotationSpeed: Float = 1.0
    @State private var showPrimeInfo: Bool = false
    
    var body: some View {
        ZStack {
            // Metal view
            FareyMetalViewRepresentable()
                .edgesIgnoringSafeArea(.all)
            
            // Controls overlay
            VStack {
                Spacer()
                
                VStack(spacing: 20) {
                    // Prime factor controls
                    VStack {
                        HStack {
                            Text("Prime Factor: \(Int(primeFactor))")
                                .foregroundColor(.white)
                            Button(action: { showPrimeInfo.toggle() }) {
                                Image(systemName: "info.circle")
                                    .foregroundColor(.white)
                            }
                        }
                        
                        Slider(value: $primeFactor, in: 2...100, step: 1)
                            .accentColor(.blue)
                            .onChange(of: primeFactor) { newValue in
                                // Ensure we only use prime numbers
                                let intValue = Int(newValue)
                                if !isPrime(intValue) {
                                    // Find next prime
                                    var nextPrime = intValue + 1
                                    while !isPrime(nextPrime) {
                                        nextPrime += 1
                                    }
                                    primeFactor = Float(nextPrime)
                                }
                            }
                    }
                    
                    // Wobble intensity slider
                    VStack {
                        Text("Wobble Intensity: \(wobbleIntensity, specifier: "%.2f")")
                            .foregroundColor(.white)
                        Slider(value: $wobbleIntensity, in: 0...1)
                            .accentColor(.green)
                    }
                    
                    // Rotation speed slider
                    VStack {
                        Text("Rotation Speed: \(rotationSpeed, specifier: "%.2f")")
                            .foregroundColor(.white)
                        Slider(value: $rotationSpeed, in: 0...2)
                            .accentColor(.purple)
                    }
                }
                .padding()
                .background(Color.black.opacity(0.7))
                .cornerRadius(15)
                .padding()
            }
            
            // Prime info overlay
            if showPrimeInfo {
                VStack {
                    Text("Prime Factors")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Current: \(Int(primeFactor))")
                        .foregroundColor(.white)
                    
                    Text("Factors: \(getPrimeFactors(Int(primeFactor)))")
                        .foregroundColor(.white)
                    
                    Button("Close") {
                        showPrimeInfo = false
                    }
                    .foregroundColor(.white)
                    .padding()
                }
                .padding()
                .background(Color.black.opacity(0.8))
                .cornerRadius(15)
                .padding()
            }
        }
    }
    
    // Helper functions
    private func isPrime(_ n: Int) -> Bool {
        guard n > 1 else { return false }
        guard n != 2 else { return true }
        guard n % 2 != 0 else { return false }
        
        let sqrtN = Int(sqrt(Double(n)))
        for i in stride(from: 3, through: sqrtN, by: 2) {
            if n % i == 0 { return false }
        }
        return true
    }
    
    private func getPrimeFactors(_ n: Int) -> String {
        var n = n
        var factors: [Int] = []
        
        // Handle 2 separately
        while n % 2 == 0 {
            factors.append(2)
            n /= 2
        }
        
        // Check odd numbers
        let sqrtN = Int(sqrt(Double(n)))
        for i in stride(from: 3, through: sqrtN, by: 2) {
            while n % i == 0 {
                factors.append(i)
                n /= i
            }
        }
        
        // If n is still greater than 2, it's a prime
        if n > 2 {
            factors.append(n)
        }
        
        // Format factors with multiplicity
        var result = ""
        var currentFactor = factors.first
        var count = 0
        
        for factor in factors {
            if factor == currentFactor {
                count += 1
            } else {
                if count > 1 {
                    result += "\(currentFactor!)^\(count) × "
                } else {
                    result += "\(currentFactor!) × "
                }
                currentFactor = factor
                count = 1
            }
        }
        
        if count > 1 {
            result += "\(currentFactor!)^\(count)"
        } else {
            result += "\(currentFactor!)"
        }
        
        return result
    }
}

// Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
} 