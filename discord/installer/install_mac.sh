if [ -z $(which node) ]; then
    echo "Please install node.js and put it on your path (.pkg should do it for you)";
    echo "https://nodejs.org/en/download/";
    read -p "Press [Enter]";
else
    echo "Found node...";
    node index.js;
fi
    
