#!/usr/bin/env python3
"""Run one frozen GrapeTree revision and save reproducible output and resources."""

import argparse
import hashlib
import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import psutil


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for part in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(part)
    return digest.hexdigest()


def source_python_sha256(source):
    digest = hashlib.sha256()
    for path in sorted(source.rglob("*.py")):
        if any(part in {".git", "__pycache__", ".venv"} for part in path.parts):
            continue
        relative = path.relative_to(source).as_posix().encode()
        digest.update(relative + b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()


def source_git_state(source):
    try:
        sha = subprocess.check_output(
            ["git", "-C", str(source), "rev-parse", "HEAD"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip()
        dirty = bool(subprocess.check_output(
            ["git", "-C", str(source), "status", "--porcelain", "--untracked-files=no"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip())
        return sha, dirty
    except subprocess.CalledProcessError:
        return None, None


def stop_group(pid, known_child_pids=(), children_visible=True,
               known_child_free=False):
    try:
        os.killpg(pid, signal.SIGKILL)
        return {"scope": "process_group", "complete": True,
                "failed_child_pids": []}
    except ProcessLookupError:
        return {"scope": "already_exited", "complete": True,
                "failed_child_pids": []}
    except PermissionError:
        failed_children = []
        for child_pid in sorted(known_child_pids):
            try:
                os.kill(child_pid, signal.SIGKILL)
            except ProcessLookupError:
                continue
            except PermissionError:
                failed_children.append(child_pid)
        parent_kill_failed = False
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        except PermissionError:
            parent_kill_failed = True
        return {"scope": "known_children_then_parent_permission_fallback",
                "complete": not failed_children and not parent_kill_failed and
                (children_visible or known_child_free),
                "failed_child_pids": failed_children,
                "parent_kill_failed": parent_kill_failed}


def temporary_bytes(workdir):
    total = 0
    try:
        paths = workdir.rglob("*")
        for path in paths:
            try:
                if path.is_file():
                    total += path.stat().st_size
            except OSError:
                # Backend removes temporary matrices while this sample runs.
                continue
    except OSError:
        pass
    return total


def run_case(args):
    source = args.source.resolve()
    profile = args.profile.resolve()
    for name, path in (("--source", source), ("--profile", profile)):
        if str(path).startswith("-"):
            raise ValueError(
                f"resolved path for {name} looks like a CLI option "
                f"({path!r}); refusing to pass it to the worker")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    workdir = output / "working"
    workdir.mkdir(exist_ok=True)
    # Keep the venv launcher path: resolving its symlink would run the system
    # interpreter without the pinned review dependencies.
    python = args.python.absolute()
    worker = Path(__file__).resolve().with_name("worker.py")
    command = [str(python), str(worker), "--source", str(source),
               "--revision", args.revision, "--profile", str(profile),
               "--method", args.method, "--matrix-type", args.matrix_type,
               "--handle-missing", args.handle_missing, "--heuristic", args.heuristic,
               "--n-proc", str(args.n_proc)]
    if args.branch_recraft:
        command.append("--branch-recraft")
    if args.wgmlst:
        command.append("--wgmlst")
    if args.total_loci is not None:
        command.extend(["--total-loci", str(args.total_loci)])
    if args.output_self_test_bytes:
        command.extend(["--output-self-test-bytes", str(args.output_self_test_bytes)])
    if getattr(args, "self_test_sleep_seconds", 0):
        command.extend(["--self-test-sleep-seconds",
                        str(args.self_test_sleep_seconds)])
    if getattr(args, "self_test_allocate_mb", 0):
        command.extend(["--self-test-allocate-mb",
                        str(args.self_test_allocate_mb)])
    env = dict(os.environ)
    env["PYTHONPATH"] = str(source)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    started = datetime.now(timezone.utc).isoformat()
    actual_git_sha, dirty = source_git_state(source)
    if actual_git_sha is not None and actual_git_sha != args.source_sha:
        raise ValueError("asserted source SHA does not match checkout HEAD")
    tic = time.monotonic()
    peak_rss_sum = 0
    cpu_seconds = 0.0
    peak_workdir_bytes = 0
    child_process_visibility = True
    known_child_pids = set()
    termination_reason = "normal_exit"
    cleanup = {"scope": "none", "complete": True, "failed_child_pids": []}
    with (output / "result.txt").open("wb") as stdout_file, \
         (output / "stderr.txt").open("wb") as stderr_file:
        process = subprocess.Popen(command, cwd=workdir, env=env,
                                   stdout=stdout_file, stderr=stderr_file,
                                   start_new_session=True)
        try:
            while process.poll() is None:
                try:
                    family = [psutil.Process(process.pid)]
                    try:
                        family.extend(family[0].children(recursive=True))
                        known_child_pids.update(item.pid for item in family[1:])
                    except OSError:
                        child_process_visibility = False
                    peak_rss_sum = max(peak_rss_sum, sum(p.memory_info().rss for p in family))
                    cpu_seconds = max(cpu_seconds, sum(
                        sum(p.cpu_times()[:2]) for p in family
                    ))
                except (psutil.Error, OSError):
                    pass
                if args.track_temp_disk:
                    peak_workdir_bytes = max(peak_workdir_bytes,
                                             temporary_bytes(workdir))
                if peak_rss_sum > args.max_rss_mb * 1024 * 1024:
                    termination_reason = "sampled_rss_limit"
                    cleanup = stop_group(
                        process.pid, known_child_pids, child_process_visibility,
                        bool(args.output_self_test_bytes or
                             getattr(args, "self_test_sleep_seconds", 0) or
                             getattr(args, "self_test_allocate_mb", 0)))
                    break
                if time.monotonic() - tic > args.timeout:
                    termination_reason = "timeout"
                    cleanup = stop_group(
                        process.pid, known_child_pids, child_process_visibility,
                        bool(args.output_self_test_bytes or
                             getattr(args, "self_test_sleep_seconds", 0) or
                             getattr(args, "self_test_allocate_mb", 0)))
                    break
                time.sleep(0.05)
        finally:
            if process.poll() is None and termination_reason == "normal_exit":
                cleanup = stop_group(process.pid, known_child_pids,
                                     child_process_visibility)
            process.wait()
    elapsed = time.monotonic() - tic
    manifest = {
        "schema_version": 1,
        "started_utc": started,
        "source": str(source),
        "source_git_sha": args.source_sha,
        "source_git_sha_verified": actual_git_sha is not None,
        "source_worktree_dirty": dirty,
        "source_python_sha256": source_python_sha256(source),
        "backend_file_sha256": file_sha256(
            source / ("module/MSTrees.py" if args.revision == "baseline"
                      else "grapetree/module/MSTrees.py")),
        "revision": args.revision,
        "profile": str(profile),
        "profile_sha256": file_sha256(profile),
        "python": str(python),
        "command": command,
        "method": args.method,
        "matrix_type": args.matrix_type,
        "handle_missing": args.handle_missing,
        "heuristic": args.heuristic,
        "branch_recraft": args.branch_recraft,
        "wgmlst": args.wgmlst,
        "n_proc": args.n_proc,
        "total_loci": args.total_loci,
        "elapsed_seconds": elapsed,
        "sampled_cpu_seconds": cpu_seconds,
        "sampled_peak_process_tree_rss_bytes": peak_rss_sum,
        "child_process_visibility": child_process_visibility,
        "max_rss_mb": args.max_rss_mb,
        "hard_address_space_limit_per_process_bytes": None,
        "rss_limit_enforcement": "sampled; macOS sandbox rejected RLIMIT_AS",
        "peak_workdir_bytes": peak_workdir_bytes if args.track_temp_disk else None,
        "resource_sampling_interval_seconds": 0.05,
        "exit_code": process.returncode,
        "termination_reason": termination_reason,
        "termination_scope": cleanup["scope"],
        "resource_cleanup_complete": cleanup["complete"],
        "failed_child_pids": cleanup["failed_child_pids"],
        "parent_kill_failed": cleanup.get("parent_kill_failed", False),
        "known_child_count": len(known_child_pids),
        "timed_out": termination_reason == "timeout",
        "stdout_sha256": file_sha256(output / "result.txt"),
        "stderr_sha256": file_sha256(output / "stderr.txt"),
    }
    (output / "run.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--source-sha", required=True,
                        help="Frozen source commit SHA, required for archive snapshots")
    parser.add_argument("--revision", choices=["baseline", "candidate"], required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--python", type=Path, required=True)
    parser.add_argument("--method", default="MSTreeV2")
    parser.add_argument("--matrix-type", default="symmetric")
    parser.add_argument("--handle-missing", default="pair_delete")
    parser.add_argument("--heuristic", default="eBurst")
    parser.add_argument("--n-proc", type=int, default=1)
    parser.add_argument("--total-loci", type=int)
    parser.add_argument("--branch-recraft", action="store_true")
    parser.add_argument("--wgmlst", action="store_true")
    parser.add_argument("--timeout", type=float, default=120.0)
    parser.add_argument("--max-rss-mb", type=int, default=6000)
    parser.add_argument("--track-temp-disk", action="store_true")
    parser.add_argument("--output-self-test-bytes", type=int, default=0,
                        help=argparse.SUPPRESS)
    parser.add_argument("--self-test-sleep-seconds", type=float, default=0,
                        help=argparse.SUPPRESS)
    parser.add_argument("--self-test-allocate-mb", type=int, default=0,
                        help=argparse.SUPPRESS)
    args = parser.parse_args()
    manifest = run_case(args)
    print(json.dumps({key: manifest[key] for key in (
        "revision", "source_git_sha", "method", "elapsed_seconds",
        "sampled_peak_process_tree_rss_bytes", "exit_code", "timed_out")}, indent=2))
    raise SystemExit(0 if manifest["exit_code"] == 0 and
                     manifest["termination_reason"] == "normal_exit" else 1)


if __name__ == "__main__":
    main()
