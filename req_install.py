import subprocess

def install_requirements(file_path=r"C:\Users\banseedhar\Desktop\AI-AGENT_PROJECTS\FinPilot-Financial_Advisor\requirements.txt"):
    with open(file_path, "r") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Remove any version specifier
            pkg = line.split("==")[0].strip()
            print(f"Installing {pkg}...")
            subprocess.run(["pip", "install", pkg], check=True)

if __name__ == "__main__":
    install_requirements()
