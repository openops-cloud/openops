
echo "Running Setup for Codespaces"

type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
&& sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
&& echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
&& sudo apt update \
&& sudo apt install gh -y

# Make relevant ports public to avoid CORS errors
gh codespace ports visibility 3000:public -c $CODESPACE_NAME
gh codespace ports visibility 3001:public -c $CODESPACE_NAME
gh codespace ports visibility 3005:public -c $CODESPACE_NAME
gh codespace ports visibility 4200:public -c $CODESPACE_NAME
