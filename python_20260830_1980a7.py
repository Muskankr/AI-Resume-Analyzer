"""
Custom load shapes for Locust tests
"""

from locust import LoadTestShape

class CustomLoadShape(LoadTestShape):
    """Custom load shape with various test patterns"""
    
    def __init__(self, test_type='load'):
        self.test_type = test_type
    
    def tick(self):
        run_time = self.get_run_time()
        
        if self.test_type == 'smoke':
            return self.smoke_shape(run_time)
        elif self.test_type == 'load':
            return self.load_shape(run_time)
        elif self.test_type == 'stress':
            return self.stress_shape(run_time)
        elif self.test_type == 'spike':
            return self.spike_shape(run_time)
        elif self.test_type == 'soak':
            return self.soak_shape(run_time)
        else:
            return self.load_shape(run_time)
    
    def smoke_shape(self, run_time):
        """Smoke test: minimal load"""
        if run_time < 30:
            return (1, 1)
        elif run_time < 60:
            return (2, 2)
        else:
            return None
    
    def load_shape(self, run_time):
        """Load test: gradually increasing load"""
        stages = [
            (0, 10),      # Start
            (120, 50),    # Ramp up
            (300, 50),    # Peak
            (420, 100),   # Increase
            (540, 100),   # Peak
            (600, 0),     # Cool down
        ]
        
        for time, users in stages:
            if run_time < time:
                return (users, users)
        return None
    
    def stress_shape(self, run_time):
        """Stress test: continuous increase until breaking point"""
        if run_time < 120:
            return (10, 10)
        elif run_time < 240:
            return (50, 50)
        elif run_time < 360:
            return (100, 100)
        elif run_time < 480:
            return (200, 200)
        elif run_time < 600:
            return (300, 300)
        else:
            return (0, 0)
    
    def spike_shape(self, run_time):
        """Spike test: sudden massive increases"""
        if run_time < 60:
            return (5, 5)
        elif run_time < 70:
            return (5, 5)  # Normal load
        elif run_time < 80:
            return (0, 0)  # Drop to zero
        elif run_time < 90:
            return (200, 200)  # Massive spike
        elif run_time < 150:
            return (200, 200)  # Sustain spike
        elif run_time < 160:
            return (5, 5)  # Return to normal
        elif run_time < 200:
            return (0, 0)  # Cool down
        else:
            return None
    
    def soak_shape(self, run_time):
        """Soak test: sustained load over long period"""
        if run_time < 300:
            return (20, 20)  # Ramp up
        elif run_time < 3600:  # 1 hour
            return (50, 50)  # Sustained load
        elif run_time < 3900:
            return (0, 0)  # Cool down
        else:
            return None