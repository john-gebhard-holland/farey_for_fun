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
    float primeFactors[8];  // Support up to 8 prime factors
    int primeMultiplicity[8];
};

// Helper function to get prime-based color using HSL
float3 hsl2rgb(float3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;
    
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(fmod(h * 6.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    
    float3 rgb;
    if (h < 1.0/6.0) rgb = float3(c, x, 0.0);
    else if (h < 2.0/6.0) rgb = float3(x, c, 0.0);
    else if (h < 3.0/6.0) rgb = float3(0.0, c, x);
    else if (h < 4.0/6.0) rgb = float3(0.0, x, c);
    else if (h < 5.0/6.0) rgb = float3(x, 0.0, c);
    else rgb = float3(c, 0.0, x);
    
    return rgb + m;
}

// Prime-based wobble function with multiple factors
float2 applyPrimeWobble(float2 uv, constant WobbleParams& params) {
    float2 center = float2(0.5, 0.5);
    float2 dir = normalize(uv - center);
    float dist = length(uv - center);
    
    float totalWobble = 0.0;
    float totalRotation = 0.0;
    
    // Combine effects from all prime factors
    for (int i = 0; i < 8; i++) {
        if (params.primeFactors[i] <= 0.0) break;
        
        float prime = params.primeFactors[i];
        int multiplicity = params.primeMultiplicity[i];
        
        // Wobble effect
        float wobble = sin(params.time * prime) * 0.1 * multiplicity;
        totalWobble += wobble;
        
        // Rotation effect
        float rotation = params.time * prime * params.rotationSpeed * 0.5;
        totalRotation += rotation * multiplicity;
    }
    
    // Apply combined effects
    float angle = totalRotation + dist * params.primeFactor;
    float2 rotated = float2(
        dir.x * cos(angle) - dir.y * sin(angle),
        dir.x * sin(angle) + dir.y * cos(angle)
    );
    
    return center + rotated * dist * (1.0 + totalWobble * params.wobbleIntensity);
}

// Main fragment shader
fragment float4 fareyWobbleShader(
    float2 uv [[stage_in]],
    constant WobbleParams& params [[buffer(0)]],
    texture2d<float> inputTexture [[texture(0)]]
) {
    constexpr sampler textureSampler(mag_filter::linear, min_filter::linear);
    
    // Calculate eye-relative position with smooth interpolation
    float2 eyeOffset = params.eyePosition - params.screenCenter;
    float2 adjustedUV = uv + eyeOffset * 0.1;
    
    // Apply prime-based wobble
    float2 wobbledUV = applyPrimeWobble(adjustedUV, params);
    
    // Sample texture with wobbled coordinates
    float4 color = inputTexture.sample(textureSampler, wobbledUV);
    
    // Calculate prime-based color
    float3 primeColor = float3(0.0);
    float totalIntensity = 0.0;
    
    for (int i = 0; i < 8; i++) {
        if (params.primeFactors[i] <= 0.0) break;
        
        float prime = params.primeFactors[i];
        int multiplicity = params.primeMultiplicity[i];
        
        // Generate HSL color based on prime
        float hue = fmod(prime * 30.0, 360.0) / 360.0;
        float saturation = 0.8;
        float lightness = 0.5 + 0.2 * sin(params.time * prime);
        
        float3 hslColor = hsl2rgb(float3(hue, saturation, lightness));
        float intensity = sin(params.time * prime) * 0.5 + 0.5;
        
        primeColor += hslColor * intensity * multiplicity;
        totalIntensity += intensity * multiplicity;
    }
    
    // Normalize and combine colors
    if (totalIntensity > 0.0) {
        primeColor /= totalIntensity;
    }
    
    float3 finalColor = mix(color.rgb, primeColor, params.wobbleIntensity);
    
    return float4(finalColor, color.a);
} 