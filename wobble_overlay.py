import pygame
import numpy as np
from OpenGL.GL import *
from OpenGL.GL import shaders
from pynput import mouse
import sys
import time

# Vertex shader for the full-screen quad
VERTEX_SHADER = """
#version 330
in vec2 position;
in vec2 texcoord;
out vec2 v_texcoord;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    v_texcoord = texcoord;
}
"""

# Fragment shader for the wobble effect
FRAGMENT_SHADER = """
#version 330
uniform sampler2D tex;
uniform float time;
uniform vec2 mouse_pos;
in vec2 v_texcoord;
out vec4 fragColor;

void main() {
    vec2 wobble = vec2(
        sin(v_texcoord.y * 10.0 + time) * 0.02,
        cos(v_texcoord.x * 10.0 + time) * 0.02
    );
    
    // Add mouse-based distortion
    vec2 mouse_dist = v_texcoord - mouse_pos;
    float mouse_influence = 1.0 / (length(mouse_dist) + 0.1);
    wobble += mouse_dist * mouse_influence * 0.1;
    
    vec2 final_texcoord = v_texcoord + wobble;
    fragColor = texture(tex, final_texcoord);
}
"""

class WobbleOverlay:
    def __init__(self):
        pygame.init()
        self.width, self.height = pygame.display.get_desktop_sizes()[0]
        
        # Create window with always-on-top flag
        pygame.display.set_mode((self.width, self.height), pygame.OPENGL | pygame.DOUBLEBUF | pygame.NOFRAME)
        pygame.display.set_caption("Wobble Overlay")
        
        # Initialize shaders
        self.init_shaders()
        
        # Initialize mouse tracking
        self.mouse_pos = np.array([0.5, 0.5], dtype=np.float32)
        self.mouse_listener = mouse.Listener(on_move=self.on_mouse_move)
        self.mouse_listener.start()
        
        # Create full-screen quad
        self.init_quad()
        
        # Create screen capture texture
        self.init_screen_texture()
        
        self.start_time = time.time()
        self.running = True

    def init_shaders(self):
        vertex_shader = shaders.compileShader(VERTEX_SHADER, GL_VERTEX_SHADER)
        fragment_shader = shaders.compileShader(FRAGMENT_SHADER, GL_FRAGMENT_SHADER)
        self.shader_program = shaders.compileProgram(vertex_shader, fragment_shader)
        
        # Get uniform locations
        self.time_loc = glGetUniformLocation(self.shader_program, "time")
        self.mouse_pos_loc = glGetUniformLocation(self.shader_program, "mouse_pos")
        self.tex_loc = glGetUniformLocation(self.shader_program, "tex")

    def init_quad(self):
        vertices = np.array([
            -1.0, -1.0,  0.0, 0.0,
             1.0, -1.0,  1.0, 0.0,
             1.0,  1.0,  1.0, 1.0,
            -1.0,  1.0,  0.0, 1.0
        ], dtype=np.float32)
        
        indices = np.array([
            0, 1, 2,
            2, 3, 0
        ], dtype=np.uint32)
        
        self.vao = glGenVertexArrays(1)
        glBindVertexArray(self.vao)
        
        vbo = glGenBuffers(1)
        glBindBuffer(GL_ARRAY_BUFFER, vbo)
        glBufferData(GL_ARRAY_BUFFER, vertices.nbytes, vertices, GL_STATIC_DRAW)
        
        ebo = glGenBuffers(1)
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, ebo)
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.nbytes, indices, GL_STATIC_DRAW)
        
        # Position attribute
        glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 16, ctypes.c_void_p(0))
        glEnableVertexAttribArray(0)
        
        # Texture coordinate attribute
        glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 16, ctypes.c_void_p(8))
        glEnableVertexAttribArray(1)

    def init_screen_texture(self):
        self.texture = glGenTextures(1)
        glBindTexture(GL_TEXTURE_2D, self.texture)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
        glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
        glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, self.width, self.height, 0, GL_RGB, GL_UNSIGNED_BYTE, None)

    def on_mouse_move(self, x, y):
        self.mouse_pos = np.array([x / self.width, 1.0 - y / self.height], dtype=np.float32)

    def capture_screen(self):
        screen = pygame.surfarray.pixels3d(pygame.display.get_surface())
        glBindTexture(GL_TEXTURE_2D, self.texture)
        glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, self.width, self.height, GL_RGB, GL_UNSIGNED_BYTE, screen)
        del screen

    def render(self):
        glClear(GL_COLOR_BUFFER_BIT)
        glUseProgram(self.shader_program)
        
        # Update uniforms
        current_time = time.time() - self.start_time
        glUniform1f(self.time_loc, current_time)
        glUniform2f(self.mouse_pos_loc, self.mouse_pos[0], self.mouse_pos[1])
        
        # Bind texture
        glActiveTexture(GL_TEXTURE0)
        glBindTexture(GL_TEXTURE_2D, self.texture)
        glUniform1i(self.tex_loc, 0)
        
        # Draw quad
        glBindVertexArray(self.vao)
        glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, None)
        
        pygame.display.flip()

    def run(self):
        while self.running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    self.running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        self.running = False
            
            self.capture_screen()
            self.render()
            pygame.time.wait(10)  # Cap at ~100 FPS
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    overlay = WobbleOverlay()
    overlay.run() 