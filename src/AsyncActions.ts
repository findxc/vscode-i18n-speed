type AsyncAction = () => Thenable<void>

export default class AsyncActions {
  private actions: AsyncAction[] = []
  private running = false
  private disposed = false

  public push(action: AsyncAction) {
    this.actions.push(action)
    this.run()
  }

  public dispose(): void {
    this.disposed = true
  }

  private run() {
    if (this.disposed || this.running) {
      return
    }

    const action = this.actions.shift()
    if (!action) {
      return
    }

    this.running = true

    action().then(() => {
      this.running = false
      this.run()
    })
  }
}
