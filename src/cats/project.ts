///<reference path='autocompleteview.ts'/>
///<reference path='isensehandler.ts'/>
///<reference path='configuration.ts'/>
///<reference path='session.ts'/>
///<reference path='editorcontextmenu.ts'/>
///<reference path='../typings/node.d.ts'/>
///<reference path='ui/tooltip.ts'/>
///<reference path='ui/filetree.ts'/>
///<reference path='../typings/ace.d.ts'/>


module cats {

    import fs = module("fs");
    import path = module("path");

    export class Project {

        // The home directory of the project
        projectDir: string;

        // The singleton TSWorker handler instance
        iSense: ISenseHandler;
        config: Configuration;
        private loadDefaultLib = true;

        // Set the project to a new directory and make sure 
        // we remove old artifacts.
        constructor(projectDir: string) {
            project = this;
            this.projectDir = path.resolve(projectDir);

            this.config = new Configuration(this.projectDir);
            this.config.load();

            this.iSense = new ISenseHandler();

            if (this.loadDefaultLib) {
                var libdts = fs.readFileSync("typings/lib.d.ts", "utf8");
                this.iSense.perform("addScript", "lib.d.ts", libdts, true, null);
            }

            this.loadTypeScriptFiles("");

        }


      
        editFile(name: string, content?: string, goto?: Ace.Position) :Session {
            var session: Session = mainEditor.getSession(name, this);

            if (!session) {
                if (content == null) content = this.readTextFile(name);
                session = new Session(this, name, content);
                mainEditor.sessions.push(session);
                mainEditor.setSession(session);
                mainEditor.moveCursorTo(goto);

                if (session.typeScriptMode) {
                    this.iSense.perform("updateScript", name, content, (err, result) => {
                        session.editSession.setAnnotations(result);
                    });
                }

            } else {
                mainEditor.setSession(session);
                this.iSense.perform("getErrors", name, (err, result) => {
                    session.editSession.setAnnotations(result);
                });
                if (goto) {
                    mainEditor.moveCursorTo(goto);
                    mainEditor.aceEditor.clearSelection();
                }
            }
            // this.session = session;

            mainEditor.show();
            tabbar.refresh();
            return session;
        }

        getFullName(name: string): string {
            return path.join(this.projectDir, name);
        }

        writeTextFile(name: string, value: string): void {
            fs.writeFileSync(this.getFullName(name), value, "utf8");
        }

        writeSession(session: Session): void {
            if (session.name === "untitled") {
                session.name = prompt("Please enter the file name") || "untitled";
            }

            if (session.name !== "untitled") {
                session.changed = false;
                this.writeTextFile(session.name, session.getValue());
            }

        }

        readTextFile(name: string): string {
            if (name === "untitled") return "";
            var data = fs.readFileSync(this.getFullName(name), "utf8");
            var content = data.replace(/\r\n?/g, "\n");
            return content;
        }

        // Load all the script that are part of the project into the tsworker
        // For now use a synchronous call to load.
        private loadTypeScriptFiles(directory: string) {
            var files = fs.readdirSync(this.getFullName(directory));
            files.forEach((file) =>{
                try {
                    var fullName = path.join(directory, file);
                    var stats = fs.statSync(this.getFullName(fullName));
                    if (stats.isFile()) {
                        var ext = path.extname(file);
                        if (ext === ".ts") {
                            var content = this.readTextFile(fullName);
                            this.iSense.perform("updateScript", fullName, content, () => { });
                            console.log("Found TypeScript file: " + fullName);
                        }
                    }
                    if (stats.isDirectory()) {
                        this.loadTypeScriptFiles(fullName);
                    }
                } catch (err) {
                    console.log("Got error while handling file " + fullName);
                    console.error(err);
                }
            });
        }


    }

}









