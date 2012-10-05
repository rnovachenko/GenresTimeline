package name.matik.genrestimeline;

import java.io.Serializable;
import java.util.Map;

public class ArtistGenreInfo implements Serializable {

	private static final long serialVersionUID = 1L;

	private String artistName;
	private boolean broken;
	private Map<String, Integer> genres;

	public ArtistGenreInfo(String artistName, Map<String, Integer> genres, boolean broken) {
		this.artistName = artistName;
		this.genres = genres;
		this.broken = broken;
	}

	public String getArtistName() {
		return artistName;
	}

	public boolean isBroken() {
		return broken;
	}

	public Map<String, Integer> getGenres() {
		return genres;
	}

}
