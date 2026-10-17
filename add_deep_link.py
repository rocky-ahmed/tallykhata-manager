with open("App.js", "r", encoding="utf-8") as f:
    code = f.read()

target = """  useEffect(() => {
    loadSavedData();
    initGoogleSignIn();
  }, []);"""

replacement = """  useEffect(() => {
    loadSavedData();
    initGoogleSignIn();

    const handleUrl = (url) => {
      if (!url) return;
      if (url.includes('tab=cashbox')) setActiveTab('cashbox');
      else if (url.includes('tab=tallypay')) setActiveTab('tallypay');
      else if (url.includes('tab=menu')) setActiveTab('menu');
      else if (url.includes('tab=home')) setActiveTab('home');

      if (url.includes('action=backup')) setModalBackupRestore(true);
      else if (url.includes('action=add_account')) setModalAddAccount(true);
      else if (url.includes('action=tagada')) setModalTagada(true);
      else if (url.includes('action=notes')) setModalNotes(true);
      else if (url.includes('action=stock')) setModalAddStock(true);
      else if (url.includes('action=inbox')) setModalInbox(true);
      else if (url.includes('action=support')) setModalSupport(true);
      else if (url.includes('action=qr')) setModalBanglaQR(true);
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub && sub.remove && sub.remove();
  }, []);"""

if target in code:
    code = code.replace(target, replacement)
    with open("App.js", "w", encoding="utf-8") as f:
        f.write(code)
    print("Added deep link navigation handler successfully!")
else:
    print("Could not find target useEffect block!")
