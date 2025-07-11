"""
Setup script for AI-Enhanced Todo Management System
"""
import subprocess
import sys
import os
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Error: {e.stderr}")
        return False


def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} is compatible")
    return True


def install_dependencies():
    """Install Python dependencies"""
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        return False
    return True


def download_spacy_model():
    """Download spaCy language model"""
    if not run_command("python -m spacy download en_core_web_sm", "Downloading spaCy English model"):
        print("⚠️  Warning: spaCy model download failed. You may need to install it manually.")
        return False
    return True


def setup_database():
    """Initialize the database"""
    if not run_command("python database.py", "Initializing database"):
        return False
    return True


def create_env_file():
    """Create environment file from example"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from example...")
        try:
            with open(env_example, 'r') as src, open(env_file, 'w') as dst:
                dst.write(src.read())
            print("✅ .env file created successfully")
            print("⚠️  Please edit .env file with your configuration")
            return True
        except Exception as e:
            print(f"❌ Failed to create .env file: {e}")
            return False
    elif env_file.exists():
        print("✅ .env file already exists")
        return True
    else:
        print("⚠️  No .env.example file found")
        return True


def run_tests():
    """Run the test suite"""
    print("🧪 Running tests...")
    if not run_command("python -m pytest tests/ -v", "Running test suite"):
        print("⚠️  Some tests failed, but setup can continue")
        return True  # Don't fail setup for test failures
    return True


def main():
    """Main setup function"""
    print("🚀 AI-Enhanced Todo Management System Setup")
    print("=" * 60)
    
    setup_steps = [
        ("Checking Python version", check_python_version),
        ("Installing dependencies", install_dependencies),
        ("Downloading spaCy model", download_spacy_model),
        ("Creating environment file", create_env_file),
        ("Setting up database", setup_database),
        ("Running tests", run_tests),
    ]
    
    failed_steps = []
    
    for step_name, step_function in setup_steps:
        print(f"\n📋 Step: {step_name}")
        if not step_function():
            failed_steps.append(step_name)
    
    print("\n" + "=" * 60)
    
    if not failed_steps:
        print("🎉 Setup completed successfully!")
        print("\n📖 Next steps:")
        print("1. Edit .env file with your configuration (optional)")
        print("2. Run the application: python main.py")
        print("3. Try the demo: python demo.py")
        print("4. Access API docs: http://localhost:8000/docs")
    else:
        print("⚠️  Setup completed with some issues:")
        for step in failed_steps:
            print(f"   - {step}")
        print("\nYou may need to resolve these issues manually.")
    
    print("\n📚 For more information, see README.md")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n👋 Setup interrupted by user")
    except Exception as e:
        print(f"\n💥 Setup failed with unexpected error: {e}")
        import traceback
        traceback.print_exc()
