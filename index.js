// index.js
import os
import json
import asyncio
import discord
from discord.ext import commands, tasks
from dotenv import load_dotenv

# Note: GPCore SDK is based on the gRPC definitions Giles found.
# We'll use a placeholder for the G-Portal client until live credentials exist.
try:
    from gpcore_sdk import Gcore
    GPORTAL_SUPPORTED = True
except ImportError:
    GPORTAL_SUPPORTED = False

load_dotenv()

# --- CONFIGURATION ---
TOKEN = os.getenv('DISCORD_TOKEN')
G_CLIENT_ID = os.getenv('GPORTAL_CLIENT_ID')
G_CLIENT_SECRET = os.getenv('GPORTAL_CLIENT_SECRET')
SERVER_ID = os.getenv('GPORTAL_SERVER_ID')  # Your Virtual Server UUID

intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="!", intents=intents)

# Local DB for testing
DB_FILE = 'verified_players.json'

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_db(data):
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

# --- G-PORTAL LOGIC ---
class GPortalManager:
    def __init__(self):
        self.client = None
        if GPORTAL_SUPPORTED and G_CLIENT_ID:
            self.client = Gcore(client_id=G_CLIENT_ID, client_secret=G_CLIENT_SECRET)

    async def send_broadcast(self, message):
        """Sends an orange text message to the game server."""
        if self.client and SERVER_ID:
            # Using the SendCommand functionality from gpcore.api.cloud.v1
            try:
                # Deadside command format
                cmd = f"broadcast {message}"
                # self.client.cloud.v1.send_command(server_id=SERVER_ID, command=cmd)
                print(f"[G-PORTAL] Sending: {cmd}")
            except Exception as e:
                print(f"[ERROR] Failed to send G-Portal command: {e}")

# Initialize G-Portal
gportal = GPortalManager()

# --- DISCORD EVENTS ---
@bot.event
async def on_ready():
    print(f'--- The Pariah is online as {bot.user} ---')
    watchdog.start()

@bot.command(name="register")
async def register(ctx, gamertag: str):
    """Link a Gamertag to a Discord ID."""
    db = load_db()
    
    # Store the link
    db[gamertag.lower()] = {
        "discord_id": ctx.author.id,
        "username": str(ctx.author),
        "verified": True
    }
    save_db(db)
    
    await ctx.send(f"✅ **{ctx.author.display_name}**, your gamertag `{gamertag}` has been registered to The Pariah.")

@bot.command(name="rules")
async def rules(ctx):
    """Accept the rules via reaction."""
    embed = discord.Embed(
        title="Server Rules & Social Contract",
        description="By playing on our Deadside server, you agree to...\n\n1. No toxicity.\n2. Verification within 45 mins.\n3. Respect the administration.",
        color=0x990000
    )
    msg = await ctx.send(embed=embed)
    await msg.add_reaction("✅")

# --- THE 45-MINUTE WATCHDOG ---
@tasks.loop(minutes=5)
async def watchdog():
    """
    This is where the bot 'listens' to the game logs.
    For now, we simulate detecting a player.
    """
    db = load_db()
    # MOCK DATA: In reality, this would come from gportal.client.gateway.v1.stream_logs
    mock_players_online = ["Giles_Henge", "Unverified_Bob"]
    
    for player in mock_players_online:
        if player.lower() not in db:
            print(f"[WATCHDOG] Found unverified player: {player}")
            # Step 1: Warn them in-game
            await gportal.send_broadcast(f"Warning: {player}, join Discord to verify or be banned in 45m!")
            
            # Step 2: logic to track their first seen time and trigger ban would go here.

@bot.event
async def on_raw_reaction_add(payload):
    # Logic to grant 'Verified' role when they click the tick on the rules
    pass

if __name__ == "__main__":
    bot.run(TOKEN)
