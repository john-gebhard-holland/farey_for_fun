import MetalKit
import SwiftUI

class FareyMetalView: MTKView {
    private var commandQueue: MTLCommandQueue!
    private var renderPipeline: MTLRenderPipelineState!
    private var computePipeline: MTLComputePipelineState!
    private var vertexBuffer: MTLBuffer!
    private var wobbleParams: WobbleParams!
    private var lastUpdateTime: CFTimeInterval = 0
    
    // Eye tracking simulation (replace with actual eye tracking)
    private var eyePosition: CGPoint = .zero
    
    struct WobbleParams {
        var time: Float = 0
        var eyePosition: SIMD2<Float> = SIMD2<Float>(0, 0)
        var screenCenter: SIMD2<Float> = SIMD2<Float>(0, 0)
        var primeFactor: Float = 2.0
        var wobbleIntensity: Float = 0.5
        var rotationSpeed: Float = 1.0
        var primeFactors: [Float] = [2.0]  // Store all prime factors
        var primeMultiplicity: [Int] = [1]  // Store multiplicity of each prime factor
    }
    
    // Prime number utilities
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
    
    private func factorize(_ n: Int) -> (factors: [Int], multiplicity: [Int]) {
        var n = n
        var factors: [Int] = []
        var multiplicity: [Int] = []
        
        // Handle 2 separately
        if n % 2 == 0 {
            var count = 0
            while n % 2 == 0 {
                n /= 2
                count += 1
            }
            factors.append(2)
            multiplicity.append(count)
        }
        
        // Check odd numbers up to sqrt(n)
        let sqrtN = Int(sqrt(Double(n)))
        for i in stride(from: 3, through: sqrtN, by: 2) {
            if n % i == 0 {
                var count = 0
                while n % i == 0 {
                    n /= i
                    count += 1
                }
                factors.append(i)
                multiplicity.append(count)
            }
        }
        
        // If n is still greater than 2, it's a prime
        if n > 2 {
            factors.append(n)
            multiplicity.append(1)
        }
        
        return (factors, multiplicity)
    }
    
    init(frame: CGRect) {
        super.init(frame: frame, device: MTLCreateSystemDefaultDevice())
        setupMetal()
        setupGestures()
    }
    
    required init(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupMetal() {
        guard let device = device else { return }
        
        // Create command queue
        commandQueue = device.makeCommandQueue()
        
        // Load shaders
        guard let library = device.makeDefaultLibrary() else { return }
        guard let vertexFunction = library.makeFunction(name: "fareyVertexShader"),
              let fragmentFunction = library.makeFunction(name: "fareyWobbleShader"),
              let computeFunction = library.makeFunction(name: "calculatePrimeFactors") else { return }
        
        // Create render pipeline
        let pipelineDescriptor = MTLRenderPipelineDescriptor()
        pipelineDescriptor.vertexFunction = vertexFunction
        pipelineDescriptor.fragmentFunction = fragmentFunction
        pipelineDescriptor.colorAttachments[0].pixelFormat = colorPixelFormat
        
        do {
            renderPipeline = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
            computePipeline = try device.makeComputePipelineState(function: computeFunction)
        } catch {
            print("Failed to create pipeline state: \(error)")
            return
        }
        
        // Create vertex buffer
        let vertices: [Float] = [
            -1, -1, 0, 1,
             1, -1, 0, 1,
            -1,  1, 0, 1,
             1,  1, 0, 1
        ]
        vertexBuffer = device.makeBuffer(bytes: vertices, length: vertices.count * MemoryLayout<Float>.size, options: [])
        
        // Initialize wobble parameters
        wobbleParams = WobbleParams()
        wobbleParams.screenCenter = SIMD2<Float>(Float(bounds.width/2), Float(bounds.height/2))
        
        // Set up display link
        preferredFramesPerSecond = 60
        isPaused = false
        enableSetNeedsDisplay = true
    }
    
    private func setupGestures() {
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        addGestureRecognizer(panGesture)
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let location = gesture.location(in: self)
        eyePosition = location
        
        // Update eye position with smooth interpolation
        let targetPosition = SIMD2<Float>(Float(location.x), Float(location.y))
        let currentPosition = wobbleParams.eyePosition
        wobbleParams.eyePosition = mix(currentPosition, targetPosition, t: 0.1)
        
        // Update prime factors if needed
        let prime = Int(wobbleParams.primeFactor)
        if isPrime(prime) {
            let (factors, multiplicity) = factorize(prime)
            wobbleParams.primeFactors = factors.map { Float($0) }
            wobbleParams.primeMultiplicity = multiplicity
        }
    }
    
    private func mix(_ a: SIMD2<Float>, _ b: SIMD2<Float>, t: Float) -> SIMD2<Float> {
        return a + (b - a) * t
    }
    
    override func draw(_ rect: CGRect) {
        guard let drawable = currentDrawable,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let renderPassDescriptor = currentRenderPassDescriptor else { return }
        
        // Update time
        let currentTime = CACurrentMediaTime()
        let deltaTime = Float(currentTime - lastUpdateTime)
        lastUpdateTime = currentTime
        wobbleParams.time += deltaTime
        
        // Create render command encoder
        guard let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else { return }
        renderEncoder.setRenderPipelineState(renderPipeline)
        
        // Set vertex buffer
        renderEncoder.setVertexBuffer(vertexBuffer, offset: 0, index: 0)
        renderEncoder.setVertexBytes(&wobbleParams, length: MemoryLayout<WobbleParams>.size, index: 1)
        
        // Set fragment parameters
        renderEncoder.setFragmentBytes(&wobbleParams, length: MemoryLayout<WobbleParams>.size, index: 0)
        
        // Draw quad
        renderEncoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        renderEncoder.endEncoding()
        
        // Present drawable
        commandBuffer.present(drawable)
        commandBuffer.commit()
    }
}

// SwiftUI wrapper
struct FareyMetalViewRepresentable: UIViewRepresentable {
    func makeUIView(context: Context) -> FareyMetalView {
        return FareyMetalView(frame: .zero)
    }
    
    func updateUIView(_ uiView: FareyMetalView, context: Context) {
        // Update view if needed
    }
}

// Preview
struct FareyMetalView_Previews: PreviewProvider {
    static var previews: some View {
        FareyMetalViewRepresentable()
    }
} 