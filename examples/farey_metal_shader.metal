#include <metal_stdlib>
using namespace metal;

// Prime-based wobble parameters
struct WobbleParams {
    float time;
    float2 eyePosition;
    float2 screenCenter;
    float primeFactor;
    float wobbleIntensity;
    float rotationSpeed;
};

// Prime color mapping
struct PrimeColor {
    float3 color;
    float intensity;
};

// Helper function to get prime-based color
float3 getPrimeColor(float prime) {
    float hue = fmod(prime * 30.0, 360.0) / 360.0;
    return float3(hue, 1.0, 0.5);
}

// Prime-based wobble function
float2 applyPrimeWobble(float2 uv, float prime, float time) {
    float wobble = sin(time * prime) * 0.1;
    float rotation = time * prime * 0.5;
    
    // Create spiral effect
    float2 center = float2(0.5, 0.5);
    float2 dir = normalize(uv - center);
    float dist = length(uv - center);
    
    // Apply prime-based rotation
    float angle = rotation + dist * prime;
    float2 rotated = float2(
        dir.x * cos(angle) - dir.y * sin(angle),
        dir.x * sin(angle) + dir.y * cos(angle)
    );
    
    return center + rotated * dist * (1.0 + wobble);
}

// Main fragment shader
fragment float4 fareyWobbleShader(
    float2 uv [[stage_in]],
    constant WobbleParams& params [[buffer(0)]],
    texture2d<float> inputTexture [[texture(0)]]
) {
    constexpr sampler textureSampler(mag_filter::linear, min_filter::linear);
    
    // Calculate eye-relative position
    float2 eyeOffset = params.eyePosition - params.screenCenter;
    float2 adjustedUV = uv + eyeOffset * 0.1;
    
    // Apply prime-based wobble
    float2 wobbledUV = applyPrimeWobble(adjustedUV, params.primeFactor, params.time);
    
    // Sample texture with wobbled coordinates
    float4 color = inputTexture.sample(textureSampler, wobbledUV);
    
    // Add prime-based glow
    float3 primeColor = getPrimeColor(params.primeFactor);
    float glow = sin(params.time * params.primeFactor) * 0.5 + 0.5;
    
    // Combine colors
    float3 finalColor = mix(color.rgb, primeColor, glow * params.wobbleIntensity);
    
    return float4(finalColor, color.a);
}

// Compute shader for prime factor calculation
kernel void calculatePrimeFactors(
    device float* primeFactors [[buffer(0)]],
    device float* output [[buffer(1)]],
    uint id [[thread_position_in_grid]]
) {
    float prime = primeFactors[id];
    float factor = 1.0;
    
    // Calculate prime-based factor
    for (int i = 2; i <= prime; i++) {
        if (fmod(prime, i) == 0) {
            factor *= i;
        }
    }
    
    output[id] = factor;
}

// Vertex shader for screen transformation
vertex float4 fareyVertexShader(
    uint vertexID [[vertex_id]],
    constant float4* vertices [[buffer(0)]],
    constant WobbleParams& params [[buffer(1)]]
) {
    float4 position = vertices[vertexID];
    
    // Apply eye-tracking based rotation
    float2 eyeDir = normalize(params.eyePosition - params.screenCenter);
    float angle = atan2(eyeDir.y, eyeDir.x);
    
    // Create rotation matrix
    float2x2 rotation = float2x2(
        cos(angle), -sin(angle),
        sin(angle), cos(angle)
    );
    
    // Apply rotation
    position.xy = rotation * position.xy;
    
    return position;
} 