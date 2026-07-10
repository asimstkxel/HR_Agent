from dotenv import load_dotenv

load_dotenv()

from agent import create_hr_agent


def main():
    agent = create_hr_agent()
    print("=" * 60)
    print("  HR Job Search Agent")
    print("  Type your job search query or 'quit' to exit.")
    print("=" * 60)

    messages = []

    while True:
        user_input = input("\nYou: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("Goodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        print("\nAgent: ", end="", flush=True)
        response = agent.invoke({"messages": messages})

        assistant_msg = response["messages"][-1]
        print(assistant_msg.content)

        messages = response["messages"]


if __name__ == "__main__":
    main()
